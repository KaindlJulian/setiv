import {
    buildTreeSkeleton,
    collectCollapsedKeys,
    materializeTree,
    treeNodeThreshold,
    type DecisionTree,
    type TreeSkeleton,
} from "@/model/decisionTree";
import { type SolverRun } from "@/model/run";
import { treeChart } from "@/view/theme";
import {
    batch,
    computed,
    effect,
    signal,
    type ReadonlySignal,
} from "@preact/signals";

export interface TreeStore {
    /** what the panel draws */
    tree: ReadonlySignal<DecisionTree | null>;

    /** whether propagations are folded into the decision that caused them */
    folded: ReadonlySignal<boolean>;
    setFolded(folded: boolean): void;

    /** whether anything is collapsed open right now */
    hasExpansions: ReadonlySignal<boolean>;
    toggleExpanded(key: string): void;
    expandAll(): void;
    collapseAll(): void;
}

export function createTreeStore(
    run: ReadonlySignal<SolverRun | null>,
    committedStep: ReadonlySignal<number>,
): TreeStore {
    const foldOverride = signal<boolean | null>(null);
    const expandAllOverride = signal<boolean | null>(null);
    const expanded = signal<ReadonlySet<string>>(new Set());

    let skeletonFor: SolverRun | null = null;
    let skeletonCache: TreeSkeleton | null = null; // built once for a run. the structure of the full tree, everything needed to materialize the tree

    // A new run invalidates both the chosen mode and every open branch.
    effect(() => {
        run.value;

        batch(() => {
            foldOverride.value = null;
            expandAllOverride.value = null;
            expanded.value = new Set();
        });
    });

    const defaultFolded = computed(
        () => (run.value?.stats.events ?? 0) > treeNodeThreshold,
    );

    const folded = computed(() => foldOverride.value ?? defaultFolded.value);

    /**
     * Built on first read, must not be touched after
     */
    const skeleton = computed(() => {
        const r = run.value;

        if (!r) {
            return null;
        }

        if (skeletonFor !== r) {
            skeletonCache = buildTreeSkeleton(r.events);
            skeletonFor = r;
        }

        return skeletonCache;
    });

    /** a tree that fits the render budget has nothing to gain from markers */
    const defaultExpandAll = computed(() => {
        const skelet = skeleton.value;
        return skelet !== null && skelet.nodeCount <= treeChart.maxNodes;
    });

    const allExpanded = computed(
        () => expandAllOverride.value ?? defaultExpandAll.value,
    );

    const tree = computed(() => {
        const skelet = skeleton.value;

        if (!skelet) {
            return null;
        }

        return materializeTree(skelet, {
            step: committedStep.value,
            foldPropagations: folded.value,
            expanded: expanded.value,
            expandAll: allExpanded.value,
            budget: treeChart.maxNodes,
        });
    });

    const hasExpansions = computed(
        () => allExpanded.value || expanded.value.size > 0,
    );

    const setFolded = (next: boolean) => {
        foldOverride.value = next;
    };

    const toggleExpanded = (key: string) => {
        const next = new Set(expanded.value);

        if (!next.delete(key)) {
            next.add(key);
        }

        expanded.value = next;
    };

    /** opens every marker the tree currently draws, deeper ones stay clickable */
    const expandAll = () => {
        const drawn = tree.peek();

        if (!drawn) {
            return;
        }

        const next = new Set(expanded.peek());
        collectCollapsedKeys(drawn.root, next);
        expanded.value = next;
    };

    const collapseAll = () => {
        batch(() => {
            expandAllOverride.value = false;
            expanded.value = new Set();
        });
    };

    return {
        tree,
        folded,
        setFolded,
        hasExpansions,
        toggleExpanded,
        expandAll,
        collapseAll,
    };
}
