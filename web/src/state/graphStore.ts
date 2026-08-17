import {
    buildImplicationGraph,
    coneOf,
    narrowNodeThreshold,
    recentOf,
    recentTrailWindow,
    type GraphScope,
    type ImplicationGraph,
} from "@/model/implicationGraph";
import { type SolverRun } from "@/model/run";
import { type SolverState } from "@/model/trail";
import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";

export interface GraphStore {
    /** what the panel draws, already narrowed to the current scope */
    graph: ReadonlySignal<ImplicationGraph | null>;

    scope: ReadonlySignal<GraphScope>;
    setScope(scope: GraphScope): void;

    /** whether there is a conflict to walk back from */
    conflictActive: ReadonlySignal<boolean>;
}

export function createGraphStore(
    run: ReadonlySignal<SolverRun | null>,
    state: ReadonlySignal<SolverState | null>,
): GraphStore {
    const scopeOverride = signal<GraphScope | null>(null);

    effect(() => {
        run.value;
        scopeOverride.value = null;
    });

    const fullGraph = computed(() => {
        const r = run.value;
        const s = state.value;

        return r && s ? buildImplicationGraph(r, s) : null;
    });

    const conflictActive = computed(() => fullGraph.value?.conflict != null);

    const defaultScope = computed<GraphScope>(() => {
        const g = fullGraph.value;

        if (!g || g.nodes.length <= narrowNodeThreshold) {
            return "full";
        }

        return g.conflict ? "cone" : "recent";
    });

    // Stepping off a conflict would leave a cone with nothing to walk back from.
    const scope = computed(() =>
        scopeOverride.value === "cone" && !conflictActive.value
            ? "recent"
            : (scopeOverride.value ?? defaultScope.value),
    );

    const graph = computed(() => {
        const g = fullGraph.value;

        if (!g) {
            return null;
        }

        switch (scope.value) {
            case "cone":
                return coneOf(g);
            case "recent":
                return recentOf(g, recentTrailWindow);
            case "full":
                return g;
        }
    });

    const setScope = (next: GraphScope) => {
        scopeOverride.value = next;
    };

    return { graph, scope, setScope, conflictActive };
}
