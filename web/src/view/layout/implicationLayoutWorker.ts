/// <reference lib="webworker" />
import type { ImplicationGraph } from "@/model/implicationGraph";
import { layoutImplicationGraph, type GraphLayout } from "./implicationLayout";

/**
 * dagre layout is expensive for many nodes, do it async on a worker thread so the ui wont freeze
 */
self.onmessage = (e: MessageEvent<ImplicationGraph>) => {
    const layout: GraphLayout = layoutImplicationGraph(e.data);
    (self as DedicatedWorkerGlobalScope).postMessage(layout);
};
