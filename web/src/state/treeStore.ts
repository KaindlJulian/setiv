import { computed, type ReadonlySignal } from "@preact/signals";
import {
    decisionsOnly,
    treeNodeThreshold,
    type DecisionTree,
} from "../model/decisionTree";
import { type SolverRun } from "../model/run";

export interface TreeStore {
    fullTree: ReadonlySignal<DecisionTree | null>;
    decisionsTree: ReadonlySignal<DecisionTree | null>;
    decisionsDefault: ReadonlySignal<boolean>;
}

export function createTreeStore(
    run: ReadonlySignal<SolverRun | null>,
): TreeStore {
    let cachedFor: DecisionTree | null = null;
    let cached: DecisionTree | null = null;

    const fullTree = computed(() => run.value?.tree ?? null);

    const decisionsTree = computed(() => {
        const full = fullTree.value;

        if (!full) {
            return null;
        }

        if (cachedFor !== full) {
            cached = decisionsOnly(full);
            cachedFor = full;
        }

        return cached;
    });

    /** which tree to draw first */
    const decisionsDefault = computed(
        () => (fullTree.value?.nodeCount ?? 0) > treeNodeThreshold,
    );

    return { fullTree, decisionsTree, decisionsDefault };
}
