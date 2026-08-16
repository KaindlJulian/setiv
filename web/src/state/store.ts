import { createCursorStore, type CursorStore } from "./cursorStore";
import { createGraphStore, type GraphStore } from "./graphStore";
import { createProjections, type RunProjections } from "./projections";
import { createSourceStore, type SourceStore } from "./sourceStore";
import { createTreeStore, type TreeStore } from "./treeStore";
import { createViewStore, type ViewStore } from "./viewStore";

/**
 * one global store broken up inti sub stores
 */
export interface SolverStore {
    source: SourceStore;
    cursor: CursorStore;
    projections: RunProjections;
    graphs: GraphStore;
    trees: TreeStore;
    view: ViewStore;
}

export function createSolverStore(): SolverStore {
    const source = createSourceStore();
    const cursor = createCursorStore(source.run);
    const projections = createProjections(source.run, cursor.stepIndex);
    const graphs = createGraphStore(source.run, cursor.selectedConflictIndex);
    const trees = createTreeStore(source.run, cursor.committedStep);
    const view = createViewStore(source.run, cursor);

    return { source, cursor, projections, graphs, trees, view };
}
