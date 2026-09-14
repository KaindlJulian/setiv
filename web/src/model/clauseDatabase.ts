import type { EventOf } from "./events";

export type ClauseOrigin = "original" | "learned";

export interface ClauseRecord {
    /** `clause_id` from the log. -1 for learned units. */
    id: number;
    /** Stable row key and display label */
    key: string;
    literals: number[];
    origin: ClauseOrigin;
    /** Event index at which the clause entered the database. */
    addedAt: number;
    /** Event index of its `delete_clause`, or -1 if it is never deleted. */
    deletedAt: number;
    glue: number | null;
}

export interface ClauseDatabase {
    clauses: ClauseRecord[];
    /** elastic index of clause_id -> index into clauses. -1 where absent. Ids are dense. */
    byId: Int32Array;
    originalCount: number;
    learnedCount: number;

    /** index of the first learned clause in `clauses`, `clauses.length` if none */
    firstLearnedIndex: number;
    /** every `deletedAt` in deletion-event order, so non-decreasing */
    deletionAt: Int32Array;
    /**
     * `deletionOriginalPrefix[k]` is how many of
     * the first `k` deletions were original clauses.
     */
    deletionOriginalPrefix: Int32Array;
}

export interface ClauseDatabaseBuilder {
    init(ev: EventOf<"init">): void;
    learn(ev: EventOf<"learn">, eventIndex: number): void;
    remove(ev: EventOf<"delete_clause">, eventIndex: number): void;
    finish(): ClauseDatabase;
}

export function createClauseDatabaseBuilder(): ClauseDatabaseBuilder {
    const clauses: ClauseRecord[] = [];
    /** filled in event order by `remove`, so it is sorted by `deletedAt` */
    const deletionOrder: number[] = [];

    let byId = new Int32Array(0);
    let originalCount = 0;
    let learnedCount = 0;

    const register = (id: number, index: number) => {
        if (id < 0) {
            return; // learned units share id -1
        }

        // grow index
        if (id >= byId.length) {
            const grown = new Int32Array(Math.max(id + 1, byId.length * 2));
            grown.fill(-1);
            grown.set(byId);
            byId = grown;
        }

        byId[id] = index;
    };

    return {
        init(ev) {
            ev.clause_list.forEach((c) => {
                register(c.id, clauses.length);
                clauses.push({
                    id: c.id,
                    key: `c${c.id}`,
                    literals: c.literals,
                    origin: "original",
                    addedAt: 0,
                    deletedAt: -1,
                    glue: null,
                });
                originalCount++;
            });
        },

        learn(ev, eventIndex) {
            register(ev.clause_id, clauses.length);
            learnedCount++;
            clauses.push({
                id: ev.clause_id,
                key:
                    ev.clause_id >= 0 ? `c${ev.clause_id}` : `u${learnedCount}`,
                literals: ev.learned_literals,
                origin: "learned",
                addedAt: eventIndex,
                deletedAt: -1,
                glue: ev.glue ?? null,
            });
        },

        remove(ev, eventIndex) {
            const index =
                ev.clause_id >= 0 && ev.clause_id < byId.length
                    ? byId[ev.clause_id]
                    : -1;

            if (index < 0 || clauses[index].deletedAt !== -1) {
                return; // unknown id, or an id deleted twice
            }

            clauses[index].deletedAt = eventIndex;
            deletionOrder.push(index);
        },

        finish() {
            const deletionAt = new Int32Array(deletionOrder.length);
            const deletionOriginalPrefix = new Int32Array(
                deletionOrder.length + 1,
            );

            for (let k = 0; k < deletionOrder.length; k++) {
                const record = clauses[deletionOrder[k]];
                deletionAt[k] = record.deletedAt;
                deletionOriginalPrefix[k + 1] =
                    deletionOriginalPrefix[k] +
                    (record.origin === "original" ? 1 : 0);
            }

            return {
                clauses,
                byId,
                originalCount,
                learnedCount,
                firstLearnedIndex: originalCount,
                deletionAt,
                deletionOriginalPrefix,
            };
        },
    };
}

/** A clause is alive if it has been added before the given step and either is never deleted or was deleted after the given step */
export function isAliveAt(record: ClauseRecord, step: number): boolean {
    return (
        record.addedAt <= step &&
        (record.deletedAt === -1 || record.deletedAt > step)
    );
}

export interface ClauseCounts {
    original: number;
    learned: number;
    deleted: number;
}

/** Which of the sidebar's three clause lists a record belongs to at a step. */
export type ClauseSection = "original" | "learned" | "deleted";

export function clauseCountsAt(db: ClauseDatabase, step: number): ClauseCounts {
    const addedLearned = countAddedLearnedAt(db, step);
    const deleted = countDeletedAt(db, step);
    const deletedOriginal = db.deletionOriginalPrefix[deleted];

    return {
        original: db.originalCount - deletedOriginal,
        learned: addedLearned - (deleted - deletedOriginal),
        deleted,
    };
}

/**
 * The records for given sidebar section.
 */
export function clausesInSectionAt(
    db: ClauseDatabase,
    section: ClauseSection,
    step: number,
): ClauseRecord[] {
    const end = originalAndLearnedCountAt(db, step);
    const wantDeleted = section === "deleted";
    const wantOrigin: ClauseOrigin =
        section === "learned" ? "learned" : "original";
    const out: ClauseRecord[] = [];

    for (let i = 0; i < end; i++) {
        const record = db.clauses[i];
        const alive = record.deletedAt === -1 || record.deletedAt > step;

        // The deleted section takes any origin; the other two take only the
        // clauses still in the database at this step.
        if (wantDeleted) {
            if (!alive) {
                out.push(record);
            }
        } else if (alive && record.origin === wantOrigin) {
            out.push(record);
        }
    }

    return out;
}

/**
 * Number of total (original + learned) clauses up to `step`.
 */
function originalAndLearnedCountAt(db: ClauseDatabase, step: number): number {
    // Originals all carry addedAt 0, so only the learned suffix needs searching.
    return db.firstLearnedIndex + countAddedLearnedAt(db, step);
}

/** Number of learned clauses up to `step`. */
function countAddedLearnedAt(db: ClauseDatabase, step: number): number {
    const { clauses, firstLearnedIndex } = db;
    let lo = firstLearnedIndex;
    let hi = clauses.length;

    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (clauses[mid].addedAt <= step) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    return lo - firstLearnedIndex;
}

/** Number of deletions that have happened at up to `step`. */
function countDeletedAt(db: ClauseDatabase, step: number): number {
    const { deletionAt } = db;
    let lo = 0;
    let hi = deletionAt.length;

    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (deletionAt[mid] <= step) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    return lo;
}

export function clauseById(
    catalog: ClauseDatabase,
    id: number | null,
): ClauseRecord | null {
    if (id == null || id < 0 || id >= catalog.byId.length) {
        return null;
    }
    const index = catalog.byId[id];
    return index >= 0 ? catalog.clauses[index] : null;
}
