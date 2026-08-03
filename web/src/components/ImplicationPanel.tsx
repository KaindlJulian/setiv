import { useState } from "preact/hooks";
import { clauseRef } from "../lib/format";
import { isChronologicalBackjump } from "../model/run";
import { useSolverStore } from "../state/context";
import { ConflictSelector } from "./ConflictSelector";
import { GraphScopeToggle } from "./GraphScopeToggle";
import { ImplicationGraph } from "./ImplicationGraph";
import { Panel } from "./Panel";

export function ImplicationPanel() {
    const store = useSolverStore();
    const [override, setOverride] = useState<boolean | null>(null);

    const conflict = store.selectedConflict.value;
    const cone = override ?? store.coneDefault.value;
    const graph = cone ? store.coneGraph.value : store.fullGraph.value;

    return (
        <Panel
            title={`Implication Graph${conflict ? ` conflict #${conflict.index}` : ""}`}
            actions={
                <div class="flex flex-wrap items-center gap-3">
                    <GraphScopeToggle cone={cone} onChange={setOverride} />
                    <ConflictSelector />
                </div>
            }
        >
            {conflict ? (
                <>
                    <div class="px-3 pt-2 text-xs text-gray-600">
                        Falsified clause {clauseRef(conflict.clauseId)} @{" "}
                        {conflict.level}
                        {conflict.learnedLiterals && (
                            <>
                                <span class="ml-2">learned:</span>
                                <code class="ml-1 rounded bg-amber-100 px-1">
                                    {conflict.learnedLiterals.join(", ")}
                                </code>
                            </>
                        )}
                        {conflict.backtrackLevel != null && (
                            <span class="ml-2">
                                backtrack to @{conflict.backtrackLevel}
                            </span>
                        )}
                        {isChronologicalBackjump(conflict) && (
                            <span
                                class="ml-2 rounded bg-sky-100 px-1 text-sky-800"
                                title="The solver returned to a different level than the learned clause called for"
                            >
                                chronological (clause jumps to @
                                {conflict.jumpLevel})
                            </span>
                        )}
                    </div>
                    <ImplicationGraph graph={graph} />
                </>
            ) : (
                <p class="p-4 text-sm text-gray-400">
                    {store.conflicts.value.length === 0
                        ? "No conflicts in this log (e.g. a SAT instance solved without conflicts)."
                        : "No conflicts at this step"}
                </p>
            )}
        </Panel>
    );
}
