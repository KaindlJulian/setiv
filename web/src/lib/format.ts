import type { TreeNode } from "../model/decisionTree";
import type { EventOf, SolverEvent } from "../model/events";
import type { TrailEntry } from "../model/trail";

const neg = "¬";
const or = "∨";
const and = "∧";

export function litLabel(lit: number): string {
    return lit < 0 ? `${neg}x${-lit}` : `x${lit}`;
}

export function clauseText(literals: number[]): string {
    return literals.map(litLabel).join(` ${or} `);
}

export function clauseRef(id: number | null): string {
    return id != null && id >= 0 ? `c${id}` : "unit";
}

/** The whole CNF, one clause per line */
export function formulaText(init: EventOf<"init"> | null): string {
    if (!init) {
        return "";
    }

    const { clause_list } = init;

    return clause_list
        .map((c, i) => {
            const conj = i < clause_list.length - 1 ? and : "";
            return `(${clauseText(c.literals)}) ${conj} `;
        })
        .join("\n");
}

export function trailReason(entry: TrailEntry): string {
    if (entry.isDecision) {
        return "decision";
    }

    return clauseRef(entry.reasonClauseId);
}

export function eventStepBarText(ev: SolverEvent | null): string {
    if (!ev) {
        return "";
    }

    switch (ev.event) {
        case "init":
            return `init | ${ev.variables} vars | ${ev.clauses} clauses`;
        case "decide":
            return `decide ${litLabel(ev.literal)} @${ev.level}`;
        case "propagate":
            return `propagate ${litLabel(ev.literal)} @${ev.level} (${clauseRef(ev.reason_clause_id)})`;
        case "conflict":
            return `conflict ${clauseRef(ev.clause_id)} @${ev.level}`;
        case "learn":
            return `learn ${clauseRef(ev.clause_id)} | jump @${ev.jump_level}`;
        case "backtrack":
            return `backtrack @${ev.from_level} -> @${ev.to_level} (${ev.kind}${ev.reason ? `: ${ev.reason}` : ""})`;
        case "restart":
            return `restart #${ev.count}`;
        case "delete_clause":
            return `delete ${clauseRef(ev.clause_id)}`;
        case "result":
            return `result: ${ev.result.toUpperCase()}`;
    }
}

export function treeNodeLabel(n: TreeNode): string {
    switch (n.kind) {
        case "root":
            return "@0";
        case "conflict":
            return `conflict (${clauseRef(n.reasonClauseId)})`;
        case "propagation":
            return `${litLabel(n.lit!)} @${n.level} (${clauseRef(n.reasonClauseId)})`;
        case "decision":
            return `${litLabel(n.lit!)} @${n.level}`;
    }
}
