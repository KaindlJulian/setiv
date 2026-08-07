import { DecisionLevelChart } from "../components/DecisionLevelChart";
import { EmptyState } from "../components/EmptyState";
import { LoadDiagnostics } from "../components/LoadDiagnostics";
import { Panel } from "../components/Panel";
import { useSource } from "../state/context";

export function ChartPage() {
    const source = useSource();

    const run = source.run.value;

    return (
        <main class="flex min-h-0 min-w-0 flex-1 flex-col">
            <LoadDiagnostics />

            {run ? (
                <div class="flex min-h-0 flex-1 flex-col p-3">
                    <Panel
                        fill
                        title={`Decision level over time (${run.stats.decisions} decisions, ${run.stats.restarts} restarts)`}
                    >
                        <DecisionLevelChart />
                    </Panel>
                </div>
            ) : (
                <EmptyState />
            )}
        </main>
    );
}
