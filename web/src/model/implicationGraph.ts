import { clauseById, type ClauseDatabase } from "./clauseDatabase";
import type { EventOf, SolverEvent } from "./events";
import type { ConflictRecord, SolverRun } from "./run";

export const conflictNodeID = "conflict";
export const coneNodeThreshold = 30;

export interface ImplicationNode {
    id: string;
    /** Index of the related event, -1 if unseen. */
    eventIndex: number;
    /** signed literal, null for the fake conflict node */
    lit: number | null;
    level: number;
    isDecision: boolean;
    isConflict: boolean;
    onLearnedClause: boolean;

    /**
     * Clause that forced this node, null for decisions and for units. On the
     * conflict node this is the falsified clause instead.
     */
    reasonClauseId: number | null;
    /** Literals of the reason clause, null when neither the log nor the db has them. */
    reasonLiterals: readonly number[] | null;
    /** Index in the conflict-time trail, -1 for the conflict node. */
    trailIndex: number;
}

export interface ImplicationEdge {
    id: string;
    source: string;
    target: string;
    /** reason clause that induced this implication, null for units. */
    clauseId: number | null;
}

export interface ImplicationGraph {
    conflict: ConflictRecord;
    nodes: ImplicationNode[];
    edges: ImplicationEdge[];
}

/** Builds an implication graph for a given conflict. */
export function buildImplicationGraph(
    run: SolverRun,
    conflictIndex: number,
): ImplicationGraph | null {
    const conflict = run.conflicts[conflictIndex];

    if (!conflict) {
        return null;
    }

    const { trail, reasonEventIndex } = conflict;
    const assigned = new Set(trail);

    const litsInLearnedClause = new Set(
        (conflict.learnedLiterals ?? []).map((l) => -l),
    );

    const nodes: ImplicationNode[] = [];
    const edges: ImplicationEdge[] = [];

    for (let k = 0; k < trail.length; k++) {
        const lit = trail[k];
        const reason = assignmentEvent(run.events, reasonEventIndex[k]);
        const antecedent =
            reason?.event === "propagate"
                ? reasonLiterals(run.clauseDb, reason)
                : [];

        nodes.push({
            id: String(lit),
            lit,
            level: reason ? reason.level : conflict.level,
            isDecision: reason?.event === "decide",
            isConflict: false,
            onLearnedClause: litsInLearnedClause.has(lit),
            reasonClauseId:
                reason?.event === "propagate" ? reason.reason_clause_id : null,
            // an empty list means "we never learned the clause", not "no literals"
            reasonLiterals: antecedent.length > 0 ? antecedent : null,
            eventIndex: reasonEventIndex[k],
            trailIndex: k,
        });
    }

    nodes.push({
        id: conflictNodeID,
        lit: null,
        level: conflict.level,
        isConflict: true,
        isDecision: false,
        onLearnedClause: false,
        reasonClauseId: conflict.clauseId,
        reasonLiterals: conflict.conflictLiterals,
        eventIndex: conflict.eventIndex,
        trailIndex: -1,
    });

    const addEdge = (
        source: string,
        target: string,
        clauseId: number | null,
    ) => {
        edges.push({ id: `e${edges.length}`, source, target, clauseId });
    };

    // antecedent edges, from the reason clause each node already resolved
    for (let k = 0; k < trail.length; k++) {
        const lit = trail[k];
        const node = nodes[k];

        for (const other of node.reasonLiterals ?? []) {
            const antecedent = -other;
            if (other !== lit && assigned.has(antecedent)) {
                addEdge(String(antecedent), String(lit), node.reasonClauseId);
            }
        }
    }

    // edges into the conflict node from the negated literals of the falsified clause
    for (const lit of conflict.conflictLiterals) {
        const antecedent = -lit;
        if (assigned.has(antecedent)) {
            addEdge(String(antecedent), conflictNodeID, conflict.clauseId);
        }
    }

    return { conflict, nodes, edges };
}

/**
 * Narrows a graph to the conflict cone.
 */
export function coneOf(graph: ImplicationGraph): ImplicationGraph {
    const incoming = new Map<string, ImplicationEdge[]>();

    for (const e of graph.edges) {
        const list = incoming.get(e.target);

        if (list) {
            list.push(e);
        } else {
            incoming.set(e.target, [e]);
        }
    }

    const reachable = new Set([conflictNodeID]);
    const stack = [conflictNodeID];

    while (stack.length > 0) {
        for (const e of incoming.get(stack.pop()!) ?? []) {
            if (!reachable.has(e.source)) {
                reachable.add(e.source);
                stack.push(e.source);
            }
        }
    }

    return {
        conflict: graph.conflict,
        nodes: graph.nodes.filter((n) => reachable.has(n.id)),
        edges: graph.edges.filter(
            (e) => reachable.has(e.target), // reachable.has(e.source), not needed assuming the graph is correct
        ),
    };
}

function reasonLiterals(
    clauseDb: ClauseDatabase,
    ev: EventOf<"propagate">,
): readonly number[] {
    return (
        clauseById(clauseDb, ev.reason_clause_id)?.literals ??
        ev.reason_literals ??
        []
    );
}

function assignmentEvent(
    events: readonly SolverEvent[],
    index: number,
): EventOf<"decide"> | EventOf<"propagate"> | null {
    if (index < 0) {
        return null;
    }

    const ev = events[index];

    return ev.event === "decide" || ev.event === "propagate" ? ev : null;
}
