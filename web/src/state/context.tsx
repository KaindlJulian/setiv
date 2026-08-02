import { createContext, type ComponentChildren } from "preact";
import { useContext, useMemo } from "preact/hooks";
import { createSolverStore, type SolverStore } from "./store";

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
