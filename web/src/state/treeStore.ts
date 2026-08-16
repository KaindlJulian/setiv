import {
    buildTreeSkeleton,
    materializeTree,
    treeNodeThreshold,
    type DecisionTree,
    type TreeScope,
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
    /** what the panel draws: already bounded, never the whole tree */
    tree: ReadonlySignal<DecisionTree | null>;

    scope: ReadonlySignal<TreeScope>;
    defaultScope: ReadonlySignal<TreeScope>;
    setScope(scope: TreeScope | null): void;

    /** whether anything is collapsed open right now */
    hasExpansions: ReadonlySignal<boolean>;
    toggleExpanded(key: string): void;
    collapseAll(): void;
}

export function createTreeStore(
    run: ReadonlySignal<SolverRun | null>,
    committedStep: ReadonlySignal<number>,
): TreeStore {
    const override = signal<TreeScope | null>(null);
    const expanded = signal<ReadonlySet<string>>(new Set());

    let skeletonFor: SolverRun | null = null;
    let skeletonCache: TreeSkeleton | null = null;

    // A new run invalidates both the chosen scope and every open branch.
    effect(() => {
        run.value;

        batch(() => {
            override.value = null;
            expanded.value = new Set();
        });
    });

    const defaultScope = computed<TreeScope>(() => {
        const stats = run.value?.stats;

        if (!stats) {
            return "full";
        }

        if (stats.events <= treeNodeThreshold) {
            return "full";
        }

        // What decisions-only would actually draw, against what d3 can take.
        return stats.decisions + stats.conflicts <= treeChart.maxNodes
            ? "decisions"
            : "active";
    });

    const scope = computed(() => override.value ?? defaultScope.value);

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

    const tree = computed(() => {
        const skelet = skeleton.value;

        if (!skelet) {
            return null;
        }

        const current = scope.value;

        return materializeTree(skelet, {
            scope: current,
            step: current === "active" ? committedStep.value : skelet.lastStep,
            expanded: expanded.value,
            budget: treeChart.maxNodes,
        });
    });

    const hasExpansions = computed(() => expanded.value.size > 0);

    const setScope = (next: TreeScope | null) => {
        override.value = next;
    };

    const toggleExpanded = (key: string) => {
        const next = new Set(expanded.value);

        if (!next.delete(key)) {
            next.add(key);
        }

        expanded.value = next;
    };

    const collapseAll = () => {
        if (expanded.value.size > 0) {
            expanded.value = new Set();
        }
    };

    return {
        tree,
        scope,
        defaultScope,
        setScope,
        hasExpansions,
        toggleExpanded,
        collapseAll,
    };
}
