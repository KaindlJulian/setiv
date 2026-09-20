import { activeNames, varLabel } from "@/lib/naming";
import type { TreeNode } from "@/model/decisionTree";
import type { SolverEvent } from "@/model/events";
import type { TrailEntry } from "@/model/trail";

const neg = "-"; // ¬
const lor = "∨";

export function litLabel(lit: number): string {
    const name = varLabel(Math.abs(lit));
    return lit < 0 ? `${neg}${name}` : name;
}

/** Longest label a chart draws */
export const maxLabelLength = 12;

/** shortenm but keep ends */
export function ellipsize(text: string): string {
    if (text.length <= maxLabelLength) {
        return text;
    }
    const head = Math.ceil((maxLabelLength - 1) / 2);
    return `${text.slice(0, head)}…${text.slice(text.length - (maxLabelLength - 1 - head))}`;
}

export function shortLitLabel(lit: number): string {
    const name = ellipsize(varLabel(Math.abs(lit)));
    return lit < 0 ? `${neg}${name}` : name;
}

export function assignmentLabel(lit: number): string {
    const v = Math.abs(lit);
    const name = activeNames.value ? varLabel(v) : `x${v}`;

    return `${name} = ${lit > 0}`;
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
        case "inspect": {
            if (!ev.watched) {
                return `inspect ${clauseRef(ev.clause_id)} ${ev.outcome}`;
            }

            const moved = ev.next_watched
                ? ` -> ${ev.next_watched.map(litLabel).join(", ")}`
                : "";

            return `inspect ${clauseRef(ev.clause_id)} ${ev.outcome} (watching ${ev.watched.map(litLabel).join(", ")}${moved})`;
        }
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
            return `${shortLitLabel(n.lit!)} @${n.level}`;
        case "decision":
            return `${shortLitLabel(n.lit!)} @${n.level}${implied}`;
        case "collapsed": {
            const hidden = compactCount(n.hiddenCount ?? 0);
            const branches = n.sources?.length ?? 0;

            return branches > 1
                ? `+${branches} branches`
                : `+${hidden} nodes @${n.level}`;
        }
    }
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }

    return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
