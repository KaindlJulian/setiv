import type { SolverRun } from "./run";

/** Truth value of a variable or literal: unassigned, true, false. */
export type Value = 0 | 1 | -1;

export interface TrailEntry {
    lit: number;
    level: number;
    /** null for decisions and for root-level units. */
    reasonClauseId: number | null;
    isDecision: boolean;
}

export interface SolverState {
    step: number;
    /** Indexed by variable; index 0 unused. */
    value: Int8Array;
    /** Decision level per variable, -1 when unassigned. */
    level: Int32Array;
    trail: TrailEntry[];
    decisionLevel: number;
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

/**
 * The assignment after replaying the stream up to and including `step`.
 *
 * A pure forward fold: three events touch the trail and nothing else does.
 */
export function replayTo(run: SolverRun, step: number): SolverState {
    const size = variableCount(run) + 1;
    const value = new Int8Array(size);
    const level = new Int32Array(size).fill(-1);
    let trail: TrailEntry[] = [];
    let decisionLevel = 0;

    /**
     * Keep every entry at or below `keep`, in its existing order.
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
    ) => {
        const v = lit < 0 ? -lit : lit;

        if (v >= size) {
            return; // literal outside the declared variable range
        }

        value[v] = lit < 0 ? -1 : 1;
        level[v] = lv;
        trail.push({ lit, level: lv, reasonClauseId, isDecision });
    };

    const last = Math.min(step, run.events.length - 1);

    for (let i = 0; i <= last; i++) {
        const ev = run.events[i];

        switch (ev.event) {
            case "decide":
                assign(ev.literal, ev.level, null, true);
                decisionLevel = ev.level;
                break;
            case "propagate":
                assign(ev.literal, ev.level, ev.reason_clause_id, false);
                break;
            case "backtrack":
                unwindTo(ev.to_level);
                decisionLevel = ev.to_level;
                break;
            default:
                break;
        }
    }

    return { step: last, value, level, trail, decisionLevel };
}

function variableCount(run: SolverRun): number {
    const init = run.init;

    if (!init) {
        return 0;
    }

    let max = init.variables;

    for (const v of init.variable_ids) {
        if (v > max) {
            max = v;
        }
    }

    return max;
}
