import type { EventOf, SolverEvent } from "./events";
import type { ConflictRecord, SolverRun } from "./run";

export const conflictNodeID = "conflict";
export const coneNodeThreshold = 30;

export interface ImplicationNode {
    id: string;
    /** signed literal, null for the fake conflict node */
    lit: number | null;
    level: number;
    isDecision: boolean;
    isConflict: boolean;
    onLearnedClause: boolean;
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

        nodes.push({
            id: String(lit),
            lit,
            level: reason ? reason.level : conflict.level,
            isDecision: reason?.event === "decide",
            isConflict: false,
            onLearnedClause: litsInLearnedClause.has(lit),
        });
    }

    nodes.push({
        id: conflictNodeID,
        lit: null,
        level: conflict.level,
        isConflict: true,
        isDecision: false,
        onLearnedClause: false,
    });

    const addEdge = (
        source: string,
        target: string,
        clauseId: number | null,
    ) => {
        edges.push({ id: `e${edges.length}`, source, target, clauseId });
    };

    // antecedent edges
    for (let k = 0; k < trail.length; k++) {
        const lit = trail[k];
        const reason = assignmentEvent(run.events, reasonEventIndex[k]);

        if (reason?.event !== "propagate") {
            continue;
        }

        for (const other of reason.reason_literals) {
            const antecedent = -other;
            if (other !== lit && assigned.has(antecedent)) {
                addEdge(
                    String(antecedent),
                    String(lit),
                    reason.reason_clause_id,
                );
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
