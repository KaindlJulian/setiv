import { ConflictSelector } from "./components/ConflictSelector";
import { DecisionTree } from "./components/DecisionTree";
import { FileInput } from "./components/FileInput";
import { ImplicationGraph } from "./components/ImplicationGraph";
import { LoadDiagnostics } from "./components/LoadDiagnostics";
import { MonoTextArea } from "./components/MonoTextArea";
import { Panel } from "./components/Panel";
import { Sidebar } from "./components/Sidebar";
import { StatsBar } from "./components/StatsBar";
import { StepBar } from "./components/StepBar";
import { clauseRef } from "./lib/format";
import { isChronologicalBackjump } from "./model/run";
import { useSolverStore } from "./state/context";

declare const __GIT_COMMIT__: string;
declare const __GIT_SUBJECT__: string;
declare const __GIT_DATE__: string;

export function App() {
    const store = useSolverStore();

    const run = store.run.value;
    const conflict = store.selectedConflict.value;

    return (
        <div class="flex h-screen flex-col overflow-hidden font-sans text-gray-800">
            <header class="shrink-0 border-b border-gray-300 px-3 py-2">
                <h1 class="text-lg font-bold">
                    SAT Visualizer WIP
                    <span class="text-xs font-normal text-gray-500">
                        (<span class="font-mono">{__GIT_COMMIT__}: </span>
                        <span>{__GIT_SUBJECT__} </span>
                        ---
                        <span> {__GIT_DATE__}</span>)
                    </span>
                </h1>
            </header>

            <StepBar />

            <div class="flex min-h-0 flex-1">
                <aside class="flex w-80 shrink-0 flex-col border-r border-gray-300 bg-gray-50">
                    <div class="min-h-0 flex-1 overflow-y-auto">
                        <Sidebar />
                    </div>
                </aside>

                <main class="min-h-0 min-w-0 flex-1 overflow-y-auto">
                    <div class="mx-auto flex max-w-300 flex-col gap-4 p-4">
                        <FileInput />

                        <LoadDiagnostics />

                        {run && <StatsBar />}

                        {run?.init && (
                            <Panel title="Formula">
                                <MonoTextArea value={store.formulaText.value} />
                            </Panel>
                        )}

                        {run && (
                            <Panel
                                title={`Decision Tree (${run.tree.decisionCount} decisions)`}
                            >
                                <DecisionTree />
                            </Panel>
                        )}

                        {run && (
                            <Panel
                                title={`Implication Graph${conflict ? ` conflict #${conflict.index}` : ""}`}
                                actions={<ConflictSelector />}
                            >
                                {conflict ? (
                                    <>
                                        <div class="px-3 pt-2 text-xs text-gray-600">
                                            Falsified clause{" "}
                                            {clauseRef(conflict.clauseId)} @{" "}
                                            {conflict.level}
                                            {/* Either half can be absent: a conflict
                                                resolved without a 1st-UIP clause has no
                                                learn, and one that unwound nothing has
                                                no backtrack. */}
                                            {conflict.learnedLiterals && (
                                                <>
                                                    <span class="ml-2">
                                                        learned:
                                                    </span>
                                                    <code class="ml-1 rounded bg-amber-100 px-1">
                                                        {conflict.learnedLiterals.join(
                                                            ", ",
                                                        )}
                                                    </code>
                                                </>
                                            )}
                                            {conflict.backtrackLevel !=
                                                null && (
                                                <span class="ml-2">
                                                    backtrack to @
                                                    {conflict.backtrackLevel}
                                                </span>
                                            )}
                                            {isChronologicalBackjump(
                                                conflict,
                                            ) && (
                                                <span
                                                    class="ml-2 rounded bg-sky-100 px-1 text-sky-800"
                                                    title="The solver returned to a different level than the learned clause called for"
                                                >
                                                    chronological (clause jumps
                                                    to @{conflict.jumpLevel})
                                                </span>
                                            )}
                                        </div>
                                        <ImplicationGraph />
                                    </>
                                ) : (
                                    <p class="p-4 text-sm text-gray-400">
                                        {run.conflicts.length === 0
                                            ? "No conflicts in this log (e.g. a SAT instance solved without conflicts)."
                                            : "No conflicts at this step"}
                                    </p>
                                )}
                            </Panel>
                        )}

                        {run && (
                            <Panel title="Event Log">
                                <MonoTextArea value={store.rawText.value} />
                            </Panel>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
