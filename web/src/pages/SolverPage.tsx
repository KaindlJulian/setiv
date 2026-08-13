import { EmptyState } from "@/components/EmptyState";
import { LoadDiagnostics } from "@/components/LoadDiagnostics";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Workspace } from "@/components/Workspace";
import { useSource } from "@/state/context";

export function SolverPage() {
    const source = useSource();

    const run = source.run.value;

    return (
        <>
            <div class="flex min-h-0 flex-1">
                {run && (
                    <aside class="border-base-300 bg-base-200 flex w-80 shrink-0 flex-col border-r">
                        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
                            <Sidebar />
                        </div>
                    </aside>
                )}

                <main class="flex min-h-0 min-w-0 flex-1 flex-col">
                    <LoadDiagnostics />
                    {run ? <Workspace /> : <EmptyState />}
                </main>
            </div>
        </>
    );
}
