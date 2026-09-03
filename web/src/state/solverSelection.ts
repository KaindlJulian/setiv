import { solverById } from "@/model/solvers";
import { computed, signal } from "@preact/signals";

/** Empty until the user picks one: the dropdown starts on "None". */
export const selectedSolverId = signal("");

export const selectedSolver = computed(
    () => solverById(selectedSolverId.value) ?? null,
);
