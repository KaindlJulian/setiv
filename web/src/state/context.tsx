import { createContext, type ComponentChildren } from "preact";
import { useContext, useMemo } from "preact/hooks";
import { type CursorStore } from "./cursorStore";
import { type GraphStore } from "./graphStore";
import { type RunProjections } from "./projections";
import { type SourceStore } from "./sourceStore";
import { createSolverStore, type SolverStore } from "./store";
import { type TreeStore } from "./treeStore";

const SolverStoreContext = createContext<SolverStore | null>(null);

export function SolverProvider({ children }: { children: ComponentChildren }) {
    const store = useMemo(() => createSolverStore(), []);
    return (
        <SolverStoreContext.Provider value={store}>
            {children}
        </SolverStoreContext.Provider>
    );
}

export function useSolverStore(): SolverStore {
    const store = useContext(SolverStoreContext);

    if (!store) {
        throw new Error("useSolverStore must be used within a SolverProvider");
    }

    return store;
}

export function useSource(): SourceStore {
    return useSolverStore().source;
}

export function useCursor(): CursorStore {
    return useSolverStore().cursor;
}

export function useProjections(): RunProjections {
    return useSolverStore().projections;
}

export function useGraphs(): GraphStore {
    return useSolverStore().graphs;
}

export function useTrees(): TreeStore {
    return useSolverStore().trees;
}
