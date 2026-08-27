import {
    buildImplicationGraph,
    coneOf,
    liveVariableThreshold,
    narrowNodeThreshold,
    type GraphScope,
    type ImplicationGraph,
} from "@/model/implicationGraph";
import { type SolverRun } from "@/model/run";
import { type SolverState } from "@/model/trail";
import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";

export interface GraphStore {
    /** what the panel draws, already narrowed to the current scope */
    graph: ReadonlySignal<ImplicationGraph | null>;

    /** the state the graph was built from, for tooltips and the conflict banner */
    state: ReadonlySignal<SolverState | null>;

    /** whether the graph follows the step, rather than show the current conflict as a snapshot */
    live: ReadonlySignal<boolean>;

    scope: ReadonlySignal<GraphScope>;
    setScope(scope: GraphScope): void;

    /** whether there is a conflict to walk back from */
    conflictActive: ReadonlySignal<boolean>;
}

export function createGraphStore(
    run: ReadonlySignal<SolverRun | null>,
    liveState: ReadonlySignal<SolverState | null>,
    conflictState: ReadonlySignal<SolverState | null>,
): GraphStore {
    const scopeOverride = signal<GraphScope | null>(null);

    effect(() => {
        run.value;
        scopeOverride.value = null;
    });

    const live = computed(
        () => (run.value?.stats.variables ?? 0) < liveVariableThreshold,
    );

    const state = computed(() =>
        live.value ? liveState.value : conflictState.value,
    );

    const fullGraph = computed(() => {
        const r = run.value;
        const s = state.value;

        return r && s ? buildImplicationGraph(r, s) : null;
    });

    const conflictActive = computed(() => fullGraph.value?.conflict != null);

    const defaultScope = computed<GraphScope>(() => {
        const g = fullGraph.value;

        return g && g.conflict && g.nodes.length > narrowNodeThreshold
            ? "cone"
            : "full";
    });

    // An override outlives the step it was picked at, and a cone needs a
    // conflict to walk back from.
    const scope = computed(() => {
        const wanted = scopeOverride.value;

        return !wanted || (wanted === "cone" && !conflictActive.value)
            ? defaultScope.value
            : wanted;
    });

    const graph = computed(() => {
        const g = fullGraph.value;

        if (!g) {
            return null;
        }

        switch (scope.value) {
            case "cone":
                return coneOf(g);
            case "full":
                return g;
        }
    });

    const setScope = (next: GraphScope) => {
        scopeOverride.value = next;
    };

    return { graph, state, live, scope, setScope, conflictActive };
}
