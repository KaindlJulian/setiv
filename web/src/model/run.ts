import { ClauseDatabase, createClauseDatabaseBuilder } from "./clauseDatabase";
import type { EventOf, SolverEvent } from "./events";

/**
 * The core "source of truth". This holds the parsed data.
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
    inspections: number;
}

/** Where a conflict sits in the run, for navigating to it. */
export interface ConflictRecord {
    index: number; // index in run.conflicts
    eventIndex: number; // index in run.events
    clauseId: number;
    level: number;
}

/**
 * Accumulates a SolverRun as events arrive.
 *
 * A live solver appends a batch at a time and takes a snapshot after each append
 */
export interface RunBuilder {
    append(batch: readonly SolverEvent[]): void;
    snapshot(): SolverRun;
    readonly eventCount: number;
}

export function createRunBuilder(): RunBuilder {
    const events: SolverEvent[] = [];
    const conflicts: ConflictRecord[] = [];
    const clauseDbBuilder = createClauseDatabaseBuilder();

    let init: EventOf<"init"> | null = null;
    let result: EventOf<"result"> | null = null;
    let decisions = 0;
    let backtracks = 0;
    let restarts = 0;
    let learned = 0;
    let deleted = 0;
    let inspections = 0;

    return {
        append(batch) {
            for (const ev of batch) {
                const i = events.length;
                events.push(ev);

                switch (ev.event) {
                    case "init": {
                        init = ev;
                        clauseDbBuilder.init(ev);
                        break;
                    }
                    case "decide": {
                        decisions++;
                        break;
                    }
                    case "propagate": {
                        break;
                    }
                    case "conflict": {
                        conflicts.push({
                            index: conflicts.length,
                            eventIndex: i,
                            clauseId: ev.clause_id,
                            level: ev.level,
                        });
                        break;
                    }
                    case "learn": {
                        learned++;
                        clauseDbBuilder.learn(ev, i);
                        break;
                    }
                    case "backtrack": {
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
                    case "inspect": {
                        inspections++;
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
        },

        snapshot() {
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
                    inspections,
                },
            };
        },

        get eventCount() {
            return events.length;
        },
    };
}

/** One pass over a complete event stream. */
export function buildRun(events: SolverEvent[]): SolverRun {
    const builder = createRunBuilder();
    builder.append(events);
    return builder.snapshot();
}
