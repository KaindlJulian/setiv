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
    /** `clause_id` -> index into `clauses`; -1 where absent. Ids are dense. */
    byId: Int32Array;
    originalCount: number;
    learnedCount: number;
}

export interface ClauseDatabaseBuilder {
    init(ev: EventOf<"init">): void;
    learn(ev: EventOf<"learn">, eventIndex: number): void;
    remove(ev: EventOf<"delete_clause">, eventIndex: number): void;
    finish(): ClauseDatabase;
}

export function createClauseDatabaseBuilder(): ClauseDatabaseBuilder {
    const clauses: ClauseRecord[] = [];

    // elastic index of clause_id -> index into clauses
    let byId = new Int32Array(0);
    let originalCount = 0;
    let learnedCount = 0;

    const register = (id: number, index: number) => {
        if (id < 0) {
            return; // learned units share id -1
        }

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
            for (const c of ev.clause_list) {
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
            }
        },

        learn(ev, eventIndex) {
            register(ev.clause_id, clauses.length);
            learnedCount++;
            clauses.push({
                id: ev.clause_id,
                key:
                    ev.clause_id >= 0 ? `c${ev.clause_id}` : `L${learnedCount}`,
                literals: ev.learned_literals,
                origin: "learned",
                addedAt: eventIndex,
                deletedAt: -1,
                glue: ev.glue,
            });
        },

        remove(ev, eventIndex) {
            const index =
                ev.clause_id >= 0 && ev.clause_id < byId.length
                    ? byId[ev.clause_id]
                    : -1;

            if (index < 0) {
                return;
            }

            clauses[index].deletedAt = eventIndex;
        },

        finish: () => ({ clauses, byId, originalCount, learnedCount }),
    };
}

/** A clause is alive if it has been added before the given step and either is never deleted or was deleted after the given step */
export function isAliveAt(record: ClauseRecord, step: number): boolean {
    return (
        record.addedAt <= step &&
        (record.deletedAt === -1 || record.deletedAt > step)
    );
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
