import type { SolverEvent } from "./events";
import type { SolverRun } from "./run";

/** Truth value of a variable or literal: unassigned, true, false. */
export type Value = 0 | 1 | -1;

export interface TrailEntry {
    lit: number;
    level: number;
    /** null for decisions and for root-level units. */
    reasonClauseId: number | null;
    isDecision: boolean;
    /** Index of the decide/propagate event that produced this assignment. */
    eventIndex: number;
}

/**
 * The conflict the log last reported, for as long as the trail it was reported
 * against is still intact. Any assignment or unwind retires it.
 */
export interface ActiveConflict {
    eventIndex: number;
    clauseId: number;
    literals: readonly number[];
    level: number;
    /** null until the `learn` event that follows is reached. */
    learnedLiterals: readonly number[] | null;
}

export interface SolverState {
    step: number;
    /** Indexed by variable; index 0 unused. */
    value: Int8Array;
    /** Decision level per variable, -1 when unassigned. */
    level: Int32Array;
    trail: TrailEntry[];
    decisionLevel: number;
    conflict: ActiveConflict | null;
}

/**
 * A cursor over the event stream that remembers where it is. Abstracts all of the caching / checkpoint logic behind
 * a simple interface.
 *
 * `stateAT(step)` returns a snapshot of the solver state at that step, and can be called repeatedly with increasing or decreasing step values.
 */
export interface Replay {
    stateAt(step: number): SolverState;
}

/**
 * Truth value of a literal under the current assignment.
 */
export function litValue(lit: number, state: SolverState): Value {
    const v = lit < 0 ? -lit : lit;

    if (v >= state.value.length) {
        return 0;
    }

    const value = state.value[v] as Value;

    return (lit < 0 ? -value : value) as Value;
}

export type ClauseStatus = "satisfied" | "falsified" | "unit" | "open";

export function clauseStatus(
    literals: readonly number[],
    state: SolverState,
): ClauseStatus {
    let open = 0;

    for (const lit of literals) {
        const value = litValue(lit, state);

        if (value === 1) {
            return "satisfied";
        }

        if (value === 0) {
            open++;
        }
    }

    return open === 0 ? "falsified" : open === 1 ? "unit" : "open";
}

interface Checkpoint {
    value: Int8Array;
    level: Int32Array;
    trail: TrailEntry[];
    decisionLevel: number;
    conflict: ActiveConflict | null;
}

/**
 * Spacing between checkpoints
 */
function defaultCheckpointInterval(eventCount: number): number {
    return Math.max(1024 * 8, Math.ceil(eventCount / 1024));
}

/**
 * Creates a replay cursor for a run. The cursor can be moved forward and backward, and will return the solver state at any step.
 */
export function createReplay(run: SolverRun): Replay {
    const events = run.events;
    const size = variableCount(run) + 1;
    const interval = defaultCheckpointInterval(events.length);

    const value = new Int8Array(size);
    const level = new Int32Array(size).fill(-1);
    let trail: TrailEntry[] = [];
    let decisionLevel = 0;
    let conflict: ActiveConflict | null = null;

    /** Index of the last applied event */
    let cursor = -1;

    /**
     * `checkpoints[n]` = the state at step `(n + 1) * interval - 1`
     */
    const checkpoints: Checkpoint[] = [];

    /**
     * Keep every entry at or below keep, in its existing order.
     */
    const unwindTo = (keep: number) => {
        const kept: TrailEntry[] = [];

        for (const entry of trail) {
            const v = entry.lit < 0 ? -entry.lit : entry.lit;

            if (level[v] <= keep) {
                kept.push(entry);
            } else {
                value[v] = 0;
                level[v] = -1;
            }
        }

        trail = kept;
    };

    const assign = (
        lit: number,
        lv: number,
        reasonClauseId: number | null,
        isDecision: boolean,
        eventIndex: number,
    ) => {
        const v = lit < 0 ? -lit : lit;

        if (v >= size) {
            return; // literal outside the declared variable range
        }

        value[v] = lit < 0 ? -1 : 1;
        level[v] = lv;
        trail.push({ lit, level: lv, reasonClauseId, isDecision, eventIndex });
    };

    const apply = (ev: SolverEvent, eventIndex: number) => {
        switch (ev.event) {
            case "decide":
                assign(ev.literal, ev.level, null, true, eventIndex);
                decisionLevel = ev.level;
                conflict = null;
                break;
            case "propagate":
                assign(
                    ev.literal,
                    ev.level,
                    ev.reason_clause_id,
                    false,
                    eventIndex,
                );
                conflict = null;
                break;
            case "backtrack":
                unwindTo(ev.to_level);
                decisionLevel = ev.to_level;
                conflict = null;
                break;
            case "conflict": {
                // needed for the live implication graph, look ahead to get learned literals on the conflict cursor.
                const next = events[eventIndex + 1];

                conflict = {
                    eventIndex,
                    clauseId: ev.clause_id,
                    literals: ev.literals,
                    level: ev.level,
                    learnedLiterals:
                        next?.event === "learn" ? next.learned_literals : null,
                };
                break;
            }
            case "learn":
                if (conflict) {
                    conflict = {
                        ...conflict,
                        learnedLiterals: ev.learned_literals,
                    };
                }
                break;
            default:
                break;
        }
    };

    const reset = () => {
        value.fill(0);
        level.fill(-1);
        trail = [];
        decisionLevel = 0;
        conflict = null;
        cursor = -1;
    };

    /** Rewind to the newest checkpoint at or before `step`. */
    const rewindTo = (step: number) => {
        const wanted = Math.floor((step + 1) / interval) - 1;
        const j = Math.min(wanted, checkpoints.length - 1);

        if (j < 0) {
            reset();
            return;
        }

        const checkpoint = checkpoints[j];

        value.set(checkpoint.value);
        level.set(checkpoint.level);
        trail = checkpoint.trail.slice();
        decisionLevel = checkpoint.decisionLevel;
        conflict = checkpoint.conflict;
        cursor = (j + 1) * interval - 1;
    };

    /**
     * Called with the cursor at `i - 1`, just before `i` is applied. Records a
     * checkpoint when that is a boundary we have not passed before.
     */
    const checkpointBefore = (i: number) => {
        if (i === 0 || i % interval !== 0) {
            return; // not a checkpoint boundary
        }

        if (i / interval - 1 !== checkpoints.length) {
            return; // already recorded on an earlier pass
        }

        checkpoints.push({
            value: value.slice(),
            level: level.slice(),
            trail: trail.slice(),
            decisionLevel,
            conflict,
        });
    };

    return {
        stateAt(step) {
            const last = Math.min(step, events.length - 1);

            if (last < cursor) {
                rewindTo(last);
            }

            for (let i = cursor + 1; i <= last; i++) {
                checkpointBefore(i);
                apply(events[i], i);
            }

            cursor = last;

            // A snapshot, not the live state: the next call mutates these.
            return {
                step: last,
                value: value.slice(),
                level: level.slice(),
                trail: trail.slice(),
                decisionLevel,
                conflict,
            };
        },
    };
}

function variableCount(run: SolverRun): number {
    const init = run.init;

    if (!init) {
        return 0;
    }

    return init.variables;
}
