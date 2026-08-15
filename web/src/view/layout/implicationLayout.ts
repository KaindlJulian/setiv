import dagre, { type Point } from "@dagrejs/dagre";
import type {
    ImplicationEdge,
    ImplicationGraph,
    ImplicationNode,
} from "@/model/implicationGraph";
import { implicationChart } from "@/view/theme";

export interface PositionedNode extends ImplicationNode {
    x: number;
    y: number;
}

export interface RoutedEdge extends ImplicationEdge {
    sourceNode: PositionedNode;
    targetNode: PositionedNode;
    /** Polyline through dagre's dummy nodes, already clipped to node borders. */
    points: Point[];
}

export interface GraphLayout {
    nodes: PositionedNode[];
    edges: RoutedEdge[];
    width: number;
    height: number;
}

/**
 * Overrides for the boxes dagre reserves. Only the node lab passes these, so it
 * can lay the same graph out for node designs of different sizes.
 */
export interface LayoutOptions {
    nodeWidth?: number;
    nodeHeight?: number;
    nodesep?: number;
    ranksep?: number;
}

/**
 * Layered left-to-right DAG:
 *
 *  - decisions and other sources on the left
 *  - propagation flowing right,
 *  - the conflict node on the far right
 *
 * That way the UIP cut is clearly noticable
 */
const layoutCache = new WeakMap<ImplicationGraph, GraphLayout>();

export function layoutImplicationGraph(
    graph: ImplicationGraph,
    options?: LayoutOptions,
): GraphLayout {
    // The cache is keyed on the graph alone, so it can only serve the default
    // sizing. Anything with overrides is computed fresh.
    if (options) {
        return computeLayout(graph, options);
    }

    const cached = layoutCache.get(graph);

    if (cached) {
        return cached;
    }

    const layout = computeLayout(graph);
    layoutCache.set(graph, layout);

    return layout;
}

function computeLayout(
    graph: ImplicationGraph,
    options: LayoutOptions = {},
): GraphLayout {
    const { boxWidth, boxHeight, margin, height } = implicationChart;

    const nodeWidth = options.nodeWidth ?? boxWidth;
    const nodeHeight = options.nodeHeight ?? boxHeight;
    const nodesep = options.nodesep ?? implicationChart.nodesep;
    const ranksep = options.ranksep ?? implicationChart.ranksep;

    const g = new dagre.graphlib.Graph({ multigraph: true });

    g.setGraph({
        rankdir: "LR",
        nodesep,
        ranksep,
        marginx: margin,
        marginy: margin,
    });
    g.setDefaultEdgeLabel(() => ({}));

    for (const n of graph.nodes) {
        g.setNode(n.id, { width: nodeWidth, height: nodeHeight });
    }

    for (const e of graph.edges) {
        g.setEdge(e.source, e.target, {}, e.id);
    }

    dagre.layout(g);

    const nodes: PositionedNode[] = graph.nodes.map((n) => {
        const p = g.node(n.id);
        return { ...n, x: p.x ?? 0, y: p.y ?? 0 };
    });

    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    const edges: RoutedEdge[] = graph.edges.map((e) => ({
        ...e,
        sourceNode: nodeById.get(e.source)!,
        targetNode: nodeById.get(e.target)!,
        points: g.edge(e.source, e.target, e.id).points ?? [],
    }));

    const label = g.graph();

    return {
        nodes,
        edges,
        width: label.width ?? 0,
        height: label.height ?? height,
    };
}
