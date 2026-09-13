import { Panel } from "@/components/Panel";
import { ScopeToggle, type ScopeOption } from "@/components/ScopeToggle";
import { clauseRef } from "@/lib/format";
import type { GraphScope } from "@/model/implicationGraph";
import { useCursor, useGraphs, useView } from "@/state/context";
import { ConflictSelector } from "./ConflictSelector";
import { ImplicationGraph } from "./ImplicationGraph";

const scopes: ScopeOption<GraphScope>[] = [
    {
        value: "cone",
        label: "Cone",
        title: "Only the predecessors of the current conflict",
    },
    {
        value: "full",
        label: "Full",
        title: "The whole implication graph of the trail (including nodes not relevant for conflict analysis)",
    },
];

export function ImplicationPanel() {
    const cursor = useCursor();
    const graphs = useGraphs();
    const view = useView();

    const live = graphs.live.value;
    const state = graphs.state.value;

    if (!state) {
        return;
    }

    const conflict = state.conflict;
    const graph = graphs.graph.value;

    const available = graphs.conflictActive.value
        ? scopes
        : scopes.filter((s) => s.value !== "cone");

    const selected = cursor.selectedConflictIndex.value;

    const anchor = state.step;
    const step = cursor.stepIndex.value;
    const detached = !live && step !== anchor;

    const title = (
        <span class="flex flex-wrap items-center gap-2">
            {live ? (
                <span class="badge badge-sm badge-ghost font-mono font-normal">
                    live
                </span>
            ) : (
                <span
                    class="badge badge-sm badge-ghost font-mono font-normal"
                    title={`For performance reasons showing a static snapshot at conflict #${selected} (event #${anchor}).`}
                >
                    snapshot #{selected}
                </span>
            )}

            {detached && (
                <button
                    type="button"
                    onClick={() => {
                        view.select(null);
                        cursor.jumpTo(anchor);
                    }}
                    title={`The cursor is ${step - anchor} events past this snapshot. Click to jump back to #${anchor}, the conflict event.`}
                    class="badge badge-sm badge-warning cursor-pointer font-mono font-normal"
                >
                    {step - anchor} behind
                </button>
            )}
        </span>
    );

    return (
        <Panel
            fill
            title={title}
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
                                <code
                                    onClick={() => {
                                        view.revealClause(conflict.clauseId);
                                    }}
                                    class="hover:text-base-content cursor-pointer font-mono hover:underline"
                                >
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
                        onSelect={(eventIndex) =>
                            view.revealGraphNode(eventIndex, anchor)
                        }
                    />
                </>
            ) : (
                <p class="text-base-content/40 flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm">
                    {live
                        ? "Nothing assigned at this step."
                        : cursor.conflicts.value.length === 0
                          ? "No conflicts in this log."
                          : "No conflicts at this step."}
                </p>
            )}
        </Panel>
    );
}
