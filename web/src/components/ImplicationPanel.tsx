import { useState } from "preact/hooks";
import { clauseRef } from "../lib/format";
import { useCursor, useGraphs } from "../state/context";
import { ConflictSelector } from "./ConflictSelector";
import { GraphScopeToggle } from "./GraphScopeToggle";
import { ImplicationGraph } from "./ImplicationGraph";
import { Panel } from "./Panel";

export function ImplicationPanel() {
    const cursor = useCursor();
    const graphs = useGraphs();
    const [override, setOverride] = useState<boolean | null>(null);

    const conflict = cursor.selectedConflict.value;
    const cone = override ?? graphs.coneDefault.value;
    const graph = cone ? graphs.coneGraph.value : graphs.fullGraph.value;

    return (
        <Panel
            fill
            title={`Implication Graph${conflict ? ` conflict #${conflict.index}` : ""}`}
            actions={
                <div class="flex flex-wrap items-center gap-2">
                    <GraphScopeToggle cone={cone} onChange={setOverride} />
                    <ConflictSelector />
                </div>
            }
        >
            {conflict ? (
                <>
                    <div class="border-base-300 text-base-content/70 flex shrink-0 flex-wrap items-center gap-1.5 border-b px-3 py-1.5 text-xs">
                        <span>
                            falsified{" "}
                            <code class="font-mono">
                                {clauseRef(conflict.clauseId)}
                            </code>{" "}
                            @{conflict.level}
                        </span>

                        {conflict.learnedLiterals && (
                            <span class="badge badge-warning badge-sm font-mono">
                                learned: {conflict.learnedLiterals.join(", ")}
                            </span>
                        )}

                        {conflict.backtrackLevel != null && (
                            <span class="badge badge-ghost badge-sm">
                                backtrack to @{conflict.backtrackLevel}
                            </span>
                        )}
                    </div>

                    <ImplicationGraph graph={graph} />
                </>
            ) : (
                <p class="text-base-content/40 flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm">
                    {cursor.conflicts.value.length === 0
                        ? "No conflicts in this log."
                        : "No conflicts at this step."}
                </p>
            )}
        </Panel>
    );
}
