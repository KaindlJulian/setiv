/// <reference lib="webworker" />
import type { ImplicationGraph } from "@/model/implicationGraph";
import {
    layoutImplicationGraph,
    type GraphLayout,
    type LayoutOptions,
} from "./implicationLayout";

export interface LayoutRequest {
    graph: ImplicationGraph;
    options: LayoutOptions;
}

/**
 * dagre layout is expensive for many nodes, do it async on a worker thread so the ui wont freeze
 */
self.onmessage = (e: MessageEvent<LayoutRequest>) => {
    const layout: GraphLayout = layoutImplicationGraph(
        e.data.graph,
        e.data.options,
    );
    (self as DedicatedWorkerGlobalScope).postMessage(layout);
};
