import { ClauseDatabase, createClauseDatabaseBuilder } from "./clauseDatabase";
import type { EventOf, SolverEvent } from "./events";

/**
 * The core "source of truth". This holds everything we derived from the logs.
 *
 * The decision tree is deliberately absent: it is the largest thing derivable
 * from the stream and most sessions never open it, so `treeStore` builds it on
 * first read instead. See `model/decisionTree.ts`.
 */
export interface SolverRun {
    events: readonly SolverEvent[];
    init: EventOf<"init"> | null;
    result: EventOf<"result"> | null;
    conflicts: ConflictRecord[];
    clauseDb: ClauseDatabase;
    stats: RunStats;
}

export interface RunStats {
    variables: number;
    clauses: number;
    events: number;
    decisions: number;
    conflicts: number;
    backtracks: number;
    restarts: number;
    learned: number;
    deleted: number;
}

export interface ConflictRecord {
    index: number; // index in run.conflicts
    eventIndex: number; // index in run.events
    clauseId: number;
    level: number;
    conflictLiterals: number[]; // todo: maybe replace with clause id lookup, what about units?
    trail: number[];
    /**
     * Parallel to `trail`: index of the `decide`/`propagate` event that
     * assigned that literal, or -1 if it was never seen
     */
    reasonEventIndex: Int32Array;

    learnedLiterals: number[] | null;
    learnedClauseId: number | null;

    /** Second-highest level in the learned clause */
    jumpLevel: number | null;
    /**
     * `to_level` of the following `kind: "conflict"` backtrack
     */
    backtrackLevel: number | null;
}

// One pass over the event stream, producing everything derivable from it
export function buildRun(events: SolverEvent[]): SolverRun {
    const litToEventIndex = new Map<number, number>();

    const conflicts: ConflictRecord[] = [];
    const clauseDbBuilder = createClauseDatabaseBuilder();

    let init: EventOf<"init"> | null = null;
    let result: EventOf<"result"> | null = null;
    let decisions = 0;
    let backtracks = 0;
    let restarts = 0;
    let learned = 0;
    let deleted = 0;

    /**
     * The conflict a following learn/backtrack belongs to, until the next
     * conflict supersedes it. Pairing is forward-only.
     * Might cause trouble with different solvers / chronological backtracking / phases
     */
    let pending: ConflictRecord | null = null;

    for (let i = 0; i < events.length; i++) {
        const ev = events[i];

        switch (ev.event) {
            case "init": {
                init = ev;
                clauseDbBuilder.init(ev);
                break;
            }
            case "decide": {
                litToEventIndex.set(ev.literal, i);
                decisions++;
                break;
            }
            case "propagate": {
                litToEventIndex.set(ev.literal, i);
                break;
            }
            case "conflict": {
                pending = snapshotConflict(
                    conflicts.length + 1,
                    i,
                    ev,
                    litToEventIndex,
                );
                conflicts.push(pending);
                break;
            }
            case "learn": {
                if (pending && pending.learnedLiterals === null) {
                    pending.learnedLiterals = ev.learned_literals;
                    pending.learnedClauseId = ev.clause_id;
                    pending.jumpLevel = ev.jump_level;
                }

                learned++;
                clauseDbBuilder.learn(ev, i);
                break;
            }
            case "backtrack": {
                if (
                    ev.kind === "conflict" &&
                    pending &&
                    pending.backtrackLevel === null
                ) {
                    pending.backtrackLevel = ev.to_level;
                }

                backtracks++;
                break;
            }
            case "restart": {
                restarts++;
                break;
            }
            case "delete_clause": {
                deleted++;
                clauseDbBuilder.remove(ev, i);
                break;
            }
            case "result": {
                result = ev;
                break;
            }
            default: {
                console.error("invalid state");
                break;
            }
        }
    }

    return {
        events,
        init,
        result,
        conflicts,
        clauseDb: clauseDbBuilder.finish(),
        stats: {
            variables: init?.variables ?? 0,
            clauses: init?.clauses ?? 0,
            events: events.length,
            decisions,
            conflicts: conflicts.length,
            backtracks,
            restarts,
            learned,
            deleted,
        },
    };
}

function snapshotConflict(
    index: number,
    eventIndex: number,
    ev: EventOf<"conflict">,
    litToEventIndex: ReadonlyMap<number, number>,
): ConflictRecord {
    const trail = ev.trail;
    const reasonEventIndex = new Int32Array(trail.length);

    for (let k = 0; k < trail.length; k++) {
        reasonEventIndex[k] = litToEventIndex.get(trail[k]) ?? -1;
    }

    return {
        index,
        eventIndex,
        clauseId: ev.clause_id,
        level: ev.level,
        conflictLiterals: ev.literals,
        trail,
        reasonEventIndex,
        learnedLiterals: null,
        learnedClauseId: null,
        jumpLevel: null,
        backtrackLevel: null,
    };
}

/**
 * Whether the solver returned to a different level than the learned clause
 * called for.
 */
export function isChronologicalBackjump(conflict: ConflictRecord): boolean {
    return (
        conflict.jumpLevel !== null &&
        conflict.backtrackLevel !== null &&
        conflict.jumpLevel !== conflict.backtrackLevel
    );
}
