import { computed, type ReadonlySignal } from "@preact/signals";
import {
    buildImplicationGraph,
    coneNodeThreshold,
    coneOf,
    type ImplicationGraph,
} from "../model/implicationGraph";
import { type SolverRun } from "../model/run";

export interface GraphStore {
    fullGraph: ReadonlySignal<ImplicationGraph | null>;
    coneGraph: ReadonlySignal<ImplicationGraph | null>;
    coneDefault: ReadonlySignal<boolean>;
}

export function createGraphStore(
    run: ReadonlySignal<SolverRun | null>,
    selectedConflictIndex: ReadonlySignal<number>,
): GraphStore {
    let graphCache = new Map<number, ImplicationGraph | null>();
    let coneCache = new Map<number, ImplicationGraph | null>();
    let graphCacheRun: SolverRun | null = null;

    const fullGraph = computed(() => {
        const r = run.value;

        if (!r) {
            return null;
        }

        if (graphCacheRun !== r) {
            graphCache = new Map();
            coneCache = new Map();
            graphCacheRun = r;
        }

        const index = selectedConflictIndex.value;

        if (!graphCache.has(index)) {
            graphCache.set(index, buildImplicationGraph(r, index));
        }

        return graphCache.get(index) ?? null;
    });

    const coneGraph = computed(() => {
        const full = fullGraph.value;

        if (!full) {
            return null;
        }

        const index = selectedConflictIndex.value;

        if (!coneCache.has(index)) {
            coneCache.set(index, coneOf(full));
        }

        return coneCache.get(index) ?? null;
    });

    /** which graph to draw first */
    const coneDefault = computed(
        () => (fullGraph.value?.nodes.length ?? 0) > coneNodeThreshold,
    );

    return { fullGraph, coneGraph, coneDefault };
}
