import { solvers } from "@/model/solvers";
import { computed, signal } from "@preact/signals";

export const selectedSolverId = signal(solvers[0].id);
export const solverInfoOpen = signal(false);

export const selectedSolver = computed(
    () => solvers.find((s) => s.id === selectedSolverId.value) ?? solvers[0],
);
