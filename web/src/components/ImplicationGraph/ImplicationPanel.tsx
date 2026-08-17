import { Panel } from "@/components/Panel";
import { ScopeToggle, type ScopeOption } from "@/components/ScopeToggle";
import { clauseRef } from "@/lib/format";
import { useGraphs, useProjections, useView } from "@/state/context";
import { useState } from "preact/hooks";
import { ConflictSelector } from "./ConflictSelector";
import { ImplicationGraph } from "./ImplicationGraph";

const scopes: ScopeOption<boolean>[] = [
    {
        value: false,
        label: "Full",
        title: "The whole implication graph (including nodes not relevant for conflict analysis)",
    },
    {
        value: true,
        label: "Cone",
        title: "Only the predecessors of the current conflict",
    },
];

export function ImplicationPanel() {
    const graphs = useGraphs();
    const projections = useProjections();
    const view = useView();

    const [override, setOverride] = useState<{
        at: number;
        cone: boolean;
    } | null>(null);

    const state = projections.committedState.value;
    const conflict = state?.conflict ?? null;

    // The override belongs to the conflict it was made on, so moving to another
    // one falls back to the default scope.
    const cone =
        conflict && override?.at === conflict.eventIndex
            ? override.cone
            : graphs.coneDefault.value;

    const graph = cone ? graphs.coneGraph.value : graphs.fullGraph.value;

    return (
        <Panel
            fill
            title="Implication Graph"
            actions={
                <div class="flex flex-wrap items-center gap-2">
                    {conflict && (
                        <ScopeToggle
                            scopes={scopes}
                            value={cone}
                            onChange={(value) =>
                                setOverride({
                                    at: conflict.eventIndex,
                                    cone: value,
                                })
                            }
                        />
                    )}
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
