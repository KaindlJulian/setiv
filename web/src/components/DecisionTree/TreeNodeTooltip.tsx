import { ClauseChips } from "@/components/ClauseChips";
import { cn } from "@/lib/cn";
import { clauseRef, compactCount } from "@/lib/format";
import { clauseById } from "@/model/clauseDatabase";
import { ROOT, type TreeNode } from "@/model/decisionTree";
import type { DecideEvent } from "@/model/events";
import { litValue, type SolverState } from "@/model/trail";
import { useProjections, useSource } from "@/state/context";

function titleOf(node: TreeNode): string {
    switch (node.kind) {
        case "root":
            return "";
        case "conflict":
            return "";
        case "collapsed":
            return (node.sources?.length ?? 0) > 1
                ? `${node.sources?.length} branches`
                : `${compactCount(node.hiddenCount ?? 0)} nodes`;
        default:
            return `x${Math.abs(node.lit!)} = ${node.lit! > 0}`;
    }
}

function trailIndexOf(state: SolverState | null, node: TreeNode): number {
    if (!state || node.kind === "root" || node.kind === "collapsed") {
        return -1;
    }
    return state.trail.findIndex((entry) => entry.eventIndex === node.id);
}

export function TreeNodeTooltip({ node }: { node: TreeNode }) {
    const run = useSource().run.value;
    const state = useProjections().solverState.value;

    if (!run) {
        return null;
    }

    const trailIndex = trailIndexOf(state, node);
    const event =
        node.kind !== "root" && node.kind !== "collapsed"
            ? run.events[node.id]
            : null;
    const clause = clauseById(run.clauseDb, node.reasonClauseId);

    return (
        <div class="flex min-w-40 flex-col gap-1">
            <div class="flex items-center gap-2">
                <span
                    class={cn(
                        "badge badge-xs",
                        node.kind === "decision" && "badge-primary",
                        node.kind === "conflict" && "badge-error",
                    )}
                >
                    {node.kind}
                </span>
                {node.isBacktracked && (
                    <span class="badge badge-ghost badge-xs">backtracked</span>
                )}
                <span class="font-mono font-semibold">{titleOf(node)}</span>
            </div>

            <dl class="text-base-content grid grid-cols-[auto_1fr] gap-x-4">
                {node.id !== ROOT && (
                    <>
                        <dt>{node.kind === "collapsed" ? "from" : "event"}</dt>
                        <dd class="font-mono">#{node.id}</dd>
                    </>
                )}

                <dt>Level</dt>
                <dd class="font-mono">@{node.level}</dd>

                {trailIndex >= 0 && state && (
                    <>
                        <dt>trail</dt>
                        <dd class="font-mono">
                            {trailIndex + 1}/{state.trail.length}
                        </dd>
                    </>
                )}

                {node.impliedCount != null && (
                    <>
                        <dt>implied</dt>
                        <dd class="font-mono">
                            +{node.impliedCount} propagations
                        </dd>
                    </>
                )}

                {node.kind === "collapsed" && (
                    <>
                        <dt>hidden</dt>
                        <dd class="font-mono">
                            {compactCount(node.hiddenCount ?? 0)} nodes
                        </dd>
                    </>
                )}
            </dl>

            {node.kind !== "root" && node.kind !== "collapsed" && (
                <div class="border-base-300/80 mt-0.5 border-t pt-1">
                    {node.kind === "decision" && (
                        <div class="text-base-content">
                            {(event as DecideEvent | null)?.heuristic ??
                                "decision"}
                        </div>
                    )}

                    {node.kind !== "decision" && (
                        <>
                            <div class="text-base-content">
                                {node.kind === "conflict"
                                    ? "falsified by"
                                    : "forced by"}{" "}
                                <span class="font-mono">
                                    {clauseRef(node.reasonClauseId)}
                                </span>
                            </div>

                            {clause && state && (
                                <ClauseChips
                                    literals={clause.literals}
                                    valueOf={(lit) => litValue(lit, state)}
                                />
                            )}
                        </>
                    )}
                </div>
            )}

            {node.kind === "collapsed" && (
                <div class="border-base-300/80 text-base-content/60 mt-0.5 border-t pt-1">
                    click to expand
                </div>
            )}

            {node.kind === "root" && (
                <div class="border-base-300/80 text-base-content/60 mt-0.5 border-t pt-1">
                    {node.impliedCount
                        ? `${node.impliedCount} root-level units`
                        : "start of the search"}
                </div>
            )}
        </div>
    );
}
