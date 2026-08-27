import { clauseById, type ClauseDatabase } from "./clauseDatabase";
import type { EventOf, SolverEvent } from "./events";
import type { SolverRun } from "./run";
import type { ActiveConflict, SolverState } from "./trail";

export const conflictNodeID = "conflict";

export type GraphScope = "cone" | "full";

export const liveVariableThreshold = 100;
export const narrowNodeThreshold = 30;

export interface ImplicationNode {
    id: string;
    /** The event that made this assignment, or reported the conflict. */
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
    /** Index in the trail, -1 for the conflict node. */
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
    conflict: ActiveConflict | null;
    nodes: ImplicationNode[];
    edges: ImplicationEdge[];
}

/** Builds the implication graph of the trail as it stands at `state`. */
export function buildImplicationGraph(
    run: SolverRun,
    state: SolverState,
): ImplicationGraph {
    const { trail, conflict } = state;
    const assigned = new Set(trail.map((entry) => entry.lit));

    const litsInLearnedClause = new Set(
        (conflict?.learnedLiterals ?? []).map((l) => -l),
    );

    const nodes: ImplicationNode[] = [];
    const edges: ImplicationEdge[] = [];

    for (let k = 0; k < trail.length; k++) {
        const entry = trail[k];
        const reason = assignmentEvent(run.events, entry.eventIndex);
        const antecedent =
            reason?.event === "propagate"
                ? reasonLiterals(run.clauseDb, reason)
                : [];

        nodes.push({
            id: String(entry.lit),
            lit: entry.lit,
            level: entry.level,
            isDecision: entry.isDecision,
            isConflict: false,
            onLearnedClause: litsInLearnedClause.has(entry.lit),
            reasonClauseId: entry.reasonClauseId,
            // an empty list means "we never learned the clause", not "no literals"
            reasonLiterals: antecedent.length > 0 ? antecedent : null,
            eventIndex: entry.eventIndex,
            trailIndex: k,
        });
    }

    if (conflict) {
        nodes.push({
            id: conflictNodeID,
            lit: null,
            level: conflict.level,
            isConflict: true,
            isDecision: false,
            onLearnedClause: false,
            reasonClauseId: conflict.clauseId,
            reasonLiterals: conflict.literals,
            eventIndex: conflict.eventIndex,
            trailIndex: -1,
        });
    }

    const addEdge = (
        source: string,
        target: string,
        clauseId: number | null,
    ) => {
        edges.push({ id: `e${edges.length}`, source, target, clauseId });
    };

    // antecedent edges, from the reason clause each node already resolved
    for (let k = 0; k < trail.length; k++) {
        const lit = trail[k].lit;
        const node = nodes[k];

        for (const other of node.reasonLiterals ?? []) {
            const antecedent = -other;
            if (other !== lit && assigned.has(antecedent)) {
                addEdge(String(antecedent), String(lit), node.reasonClauseId);
            }
        }
    }

    // edges into the conflict node from the negated literals of the falsified clause
    if (conflict) {
        for (const lit of conflict.literals) {
            const antecedent = -lit;
            if (assigned.has(antecedent)) {
                addEdge(String(antecedent), conflictNodeID, conflict.clauseId);
            }
        }
    }

    return { conflict, nodes, edges };
}

function subgraph(
    graph: ImplicationGraph,
    keep: ReadonlySet<string>,
): ImplicationGraph {
    return {
        conflict: graph.conflict,
        nodes: graph.nodes.filter((n) => keep.has(n.id)),
        edges: graph.edges.filter(
            (e) => keep.has(e.source) && keep.has(e.target),
        ),
    };
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

    return subgraph(graph, reachable);
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
