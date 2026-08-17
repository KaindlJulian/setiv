import { Panel } from "@/components/Panel";
import { ScopeToggle, type ScopeOption } from "@/components/ScopeToggle";
import { clauseRef } from "@/lib/format";
import type { GraphScope } from "@/model/implicationGraph";
import { useGraphs, useProjections, useView } from "@/state/context";
import { ConflictSelector } from "./ConflictSelector";
import { ImplicationGraph } from "./ImplicationGraph";

const scopes: ScopeOption<GraphScope>[] = [
    {
        value: "recent",
        label: "Recent",
        title: "The newest assignments on the trail and what forced them",
    },
    {
        value: "cone",
        label: "Cone",
        title: "Only the predecessors of the current conflict",
    },
    {
        value: "full",
        label: "Full",
        title: "The whole implication graph (including nodes not relevant for conflict analysis)",
    },
];

export function ImplicationPanel() {
    const graphs = useGraphs();
    const projections = useProjections();
    const view = useView();

    const state = projections.committedState.value;
    const conflict = state?.conflict ?? null;
    const graph = graphs.graph.value;

    const available = graphs.conflictActive.value
        ? scopes
        : scopes.filter((s) => s.value !== "cone");

    return (
        <Panel
            fill
            title="Implication Graph"
            actions={
                <div class="flex flex-wrap items-center gap-2">
                    <ScopeToggle
                        scopes={available}
                        value={graphs.scope.value}
                        onChange={graphs.setScope}
                    />
                    <ConflictSelector />
                </div>
            }
        >
            {state && graph && graph.nodes.length > 0 ? (
                <>
                    {conflict && (
                        <div class="border-base-300 text-base-content/70 flex shrink-0 flex-wrap items-center gap-1.5 border-b px-3 py-1.5 text-xs">
                            <span>
                                in{" "}
                                <code class="font-mono">
                                    {clauseRef(conflict.clauseId)}
                                </code>{" "}
                                @{conflict.level}
                            </span>

                            {conflict.learnedLiterals && (
                                <span class="badge badge-warning badge-sm font-mono">
                                    learned:{" "}
                                    {conflict.learnedLiterals.join(", ")}
                                </span>
                            )}
                        </div>
                    )}

                    <ImplicationGraph
                        graph={graph}
                        state={state}
                        onSelect={view.revealInTrail}
                    />
                </>
            ) : (
                <p class="text-base-content/40 flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm">
                    Nothing assigned at this step.
                </p>
            )}
        </Panel>
    );
}
