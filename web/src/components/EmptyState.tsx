import { useDismiss } from "@/hooks/useDismiss";
import { solverInfoOpen } from "@/state/solverSelection";
import { useRef } from "preact/hooks";
import { FileInput } from "./FileInput";
import { SolverCard } from "./SolverCard";

export function EmptyState() {
    const ref = useRef<HTMLDivElement>(null);

    useDismiss(ref, solverInfoOpen.value, () => {
        solverInfoOpen.value = false;
    });

    return (
        <div class="hero bg-base-200 min-h-0 flex-1 overflow-y-auto p-6">
            <div class="hero-content w-full max-w-md flex-col items-stretch">
                <div ref={ref} class="relative w-full">
                    <div class="card card-border border-base-300 bg-base-100">
                        <div class="card-body p-4">
                            <FileInput showInfoToggle />
                        </div>
                    </div>
                    {solverInfoOpen.value && (
                        <div class="absolute top-0 left-106 w-full">
                            <SolverCard />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
