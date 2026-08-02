import { ClauseDatabase, createClauseDatabaseBuilder } from "./clauseDatabase";
import { createDecisionTreeBuilder, type DecisionTree } from "./decisionTree";
import type { EventOf, SolverEvent } from "./events";

export interface ConflictRecord {
    index: number;
    /** Position of the `conflict` event in `SolverRun.events` */
    eventIndex: number;
    clauseId: number;
    level: number;
    /** Literals of the falsified clause */
    conflictLiterals: number[];
    /** Assignment trail at conflict time */
    trail: number[];
    /**
     * Parallel to `trail`: index of the `decide`/`propagate` event that
     * assigned that literal, or -1 if it was never seen
     */
    reasonEventIndex: Int32Array;
    /**
     * From the following `learn`, when there is one. Null at decision level 0,
     * and also whenever the solver resolved the conflict without deriving a
     * 1st-UIP clause (on-the-fly subsumption, a forced driving assignment).
     */
    learnedLiterals: number[] | null;
    learnedClauseId: number | null;
    /** Second-highest level in the learned clause; a property of the clause. */
    jumpLevel: number | null;
    /**
     * `to_level` of the following `kind: "conflict"` backtrack; a property of
     * the trail transition. Null when the conflict unwound nothing.
     * `jumpLevel !== backtrackLevel` means the backjump was chronological.
     */
    backtrackLevel: number | null;
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

export interface SolverRun {
    events: readonly SolverEvent[];
    init: EventOf<"init"> | null;
    result: EventOf<"result"> | null;
    conflicts: ConflictRecord[];
    tree: DecisionTree;
    clauses: ClauseDatabase;
    stats: RunStats;
}

// One pass over the event stream, producing everything derivable from it in linear time.
export function buildRun(events: SolverEvent[]): SolverRun {
    const litToEventIndex = new Map<number, number>();

    const conflicts: ConflictRecord[] = [];
    const tree = createDecisionTreeBuilder();
    const clauses = createClauseDatabaseBuilder();

    let init: EventOf<"init"> | null = null;
    let result: EventOf<"result"> | null = null;
    let decisions = 0;
    let backtracks = 0;
    let restarts = 0;
    let learned = 0;
    let deleted = 0;

    /**
     * The conflict a following `learn`/`backtrack` belongs to, until the next
     * `conflict` supersedes it. Pairing is forward-only and by proximity: a
     * `kind: "conflict"` unwind is not guaranteed to sit after its conflict
     * event (a chronological one is taken before the conflict is reported), so
     * an unpaired conflict simply keeps its nulls.
     */
    let pending: ConflictRecord | null = null;

    for (let i = 0; i < events.length; i++) {
        const ev = events[i];

        switch (ev.event) {
            case "init":
                init = ev;
                clauses.init(ev);
                break;

            case "decide":
                litToEventIndex.set(ev.literal, i);
                tree.decide(ev);
                decisions++;
                break;

            case "propagate":
                litToEventIndex.set(ev.literal, i);
                tree.propagate(ev);
                break;

            case "conflict": {
                pending = snapshotConflict(
                    conflicts.length + 1,
                    i,
                    ev,
                    litToEventIndex,
                );
                conflicts.push(pending);
                tree.conflict(ev);
                break;
            }

            case "learn":
                if (pending && pending.learnedLiterals === null) {
                    pending.learnedLiterals = ev.learned_literals;
                    pending.learnedClauseId = ev.clause_id;
                    pending.jumpLevel = ev.jump_level;
                }

                learned++;
                clauses.learn(ev, i);
                break;

            case "backtrack":
                if (
                    ev.kind === "conflict" &&
                    pending &&
                    pending.backtrackLevel === null
                ) {
                    pending.backtrackLevel = ev.to_level;
                }

                backtracks++;

                // Every unwind moves the trail the same way, whatever caused it.
                tree.backtrackTo(ev.to_level);
                break;

            case "restart":
                restarts++;
                break;

            case "delete_clause":
                deleted++;
                clauses.remove(ev, i);
                break;

            case "result":
                result = ev;
                break;

            default:
                break;
        }
    }

    return {
        events,
        init,
        result,
        conflicts,
        tree: tree.finish(),
        clauses: clauses.finish(),
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
 * called for. Only visible because v2 attributes the two to separate events.
 */
export function isChronologicalBackjump(conflict: ConflictRecord): boolean {
    return (
        conflict.jumpLevel !== null &&
        conflict.backtrackLevel !== null &&
        conflict.jumpLevel !== conflict.backtrackLevel
    );
}
