import type { TreeNode } from "@/model/decisionTree";
import type { SolverEvent } from "@/model/events";
import type { TrailEntry } from "@/model/trail";

const neg = "-"; // ¬
const lor = "∨";

export function litLabel(lit: number): string {
    return lit < 0 ? `${neg}${-lit}` : `${lit}`;
}

export function clauseText(literals: number[]): string {
    return literals.map(litLabel).join(` ${lor} `);
}

export function clauseRef(id: number | null): string {
    return id != null && id >= 0 ? `c${id}` : "unit";
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
            return `init ${ev.variables} variables ${ev.clauses} clauses`;
        case "decide":
            return `decide ${litLabel(ev.literal)} @${ev.level}`;
        case "propagate":
            return `propagate ${litLabel(ev.literal)} @${ev.level} (${clauseRef(ev.reason_clause_id)})`;
        case "conflict":
            return `conflict ${clauseRef(ev.clause_id)} @${ev.level}`;
        case "learn":
            return `learn ${clauseRef(ev.clause_id)} (${clauseText(ev.learned_literals)})`;
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

export function compactCount(n: number): string {
    if (n < 1000) {
        return String(n);
    }

    if (n < 1_000_000) {
        return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
    }

    return `${(n / 1_000_000).toFixed(1)}M`;
}

export function treeNodeLabel(n: TreeNode): string {
    const implied = n.impliedCount ? ` +${n.impliedCount}` : "";

    switch (n.kind) {
        case "root":
            return `@0${implied}`;
        case "conflict":
            return `conflict (${clauseRef(n.reasonClauseId)})`;
        case "propagation":
            return `${litLabel(n.lit!)} @${n.level} (${clauseRef(n.reasonClauseId)})`;
        case "decision":
            return `${litLabel(n.lit!)} @${n.level}${implied}`;
        case "collapsed": {
            const hidden = compactCount(n.hiddenCount ?? 0);
            const branches = n.sources?.length ?? 0;

            return branches > 1
                ? `+${branches} branches`
                : `+${hidden} nodes @${n.level}`;
        }
    }
}
