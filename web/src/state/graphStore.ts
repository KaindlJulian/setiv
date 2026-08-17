import { computed, type ReadonlySignal } from "@preact/signals";
import {
    buildImplicationGraph,
    coneNodeThreshold,
    coneOf,
    type ImplicationGraph,
} from "@/model/implicationGraph";
import { type SolverRun } from "@/model/run";
import { type SolverState } from "@/model/trail";

export interface GraphStore {
    fullGraph: ReadonlySignal<ImplicationGraph | null>;
    coneGraph: ReadonlySignal<ImplicationGraph | null>;
    coneDefault: ReadonlySignal<boolean>;
}

export function createGraphStore(
    run: ReadonlySignal<SolverRun | null>,
    state: ReadonlySignal<SolverState | null>,
): GraphStore {
    const fullGraph = computed(() => {
        const r = run.value;
        const s = state.value;

        return r && s ? buildImplicationGraph(r, s) : null;
    });

    // Without a conflict there is nothing to walk back from, so the cone is the
    // whole graph.
    const coneGraph = computed(() => {
        const full = fullGraph.value;

        return full && full.conflict ? coneOf(full) : full;
    });

    /** which graph to draw first */
    const coneDefault = computed(
        () => (fullGraph.value?.nodes.length ?? 0) > coneNodeThreshold,
    );

    return { fullGraph, coneGraph, coneDefault };
}
