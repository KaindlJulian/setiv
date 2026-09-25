import { solverById, solvers } from "@/model/solvers";
import { computed, signal } from "@preact/signals";

/** There is no "no solver" case: the first one is the default. */
export const selectedSolverId = signal(solvers[0].id);

export const selectedSolver = computed(
    () => solverById(selectedSolverId.value) ?? solvers[0],
);
