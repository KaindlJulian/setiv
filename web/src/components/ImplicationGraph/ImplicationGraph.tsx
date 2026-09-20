import { HoverCard } from "@/components/HoverCard";
import { Legend } from "@/components/Legend";
import { useElementSize } from "@/hooks/useElementSize";
import { cn } from "@/lib/cn";
import { activeNames } from "@/lib/naming";
import type { ImplicationGraph as Graph } from "@/model/implicationGraph";
import type { SolverState } from "@/model/trail";
import { useGraphs, useView } from "@/state/context";
import {
    chipWidthFor,
    drawImplicationNode,
    implicationLegend,
} from "@/view/implicationNode";
import {
    layoutImplicationGraph,
    type GraphLayout,
    type LayoutOptions,
    type PositionedNode,
    type RoutedEdge,
} from "@/view/layout/implicationLayout";
import LayoutWorker from "@/view/layout/implicationLayoutWorker?worker";
import { createSvgCanvas } from "@/view/svgCanvas";
import { colors, implicationChart } from "@/view/theme";
import type { Point } from "@dagrejs/dagre";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "preact/hooks";
import { NodeTooltip } from "./NodeTooltip";

interface Hover {
    node: PositionedNode;
    x: number;
    y: number;
}

/** opacity of everything outside the hovered neighbourhood */
const dimmed = 0.15;
const edgeOpacity = 0.5;
const edgeLabelOpacity = 0.75;
const fadeMs = 150;

const enterMs = 260;

interface Props {
    graph: Graph | null;
    state: SolverState;
    onSelect(eventIndex: number): void;
}

const requestLayoutFromWorker = (
    worker: Worker,
    graph: Graph,
    options: LayoutOptions,
) =>
    new Promise<GraphLayout>((resolve) => {
        worker.onmessage = (e: MessageEvent<GraphLayout>) => resolve(e.data);
        worker.postMessage({ graph, options });
    });

/** the conflict node is not an assignment, so there is nothing to select */
const clickable = (d: PositionedNode) => !d.isConflict;

function enteringNode(
    nodes: PositionedNode[],
    drawn: ReadonlySet<string> | null,
): PositionedNode | null {
    if (!drawn) {
        return null;
    }

    const ids = new Set(nodes.map((n) => n.id));

    for (const id of drawn) {
        if (!ids.has(id)) {
            return null;
        }
    }

    const fresh = nodes.filter((n) => !drawn.has(n.id));
    return fresh.length === 1 ? fresh[0] : null;
}

export function ImplicationGraph({ graph, state, onSelect }: Props) {
    const [box, size, boxEl] = useElementSize<HTMLDivElement>();
    const svgRef = useRef<SVGSVGElement>(null);
    const [hover, setHover] = useState<Hover | null>(null);
    const [drawing, setDrawing] = useState(false);
    const view = useView();
    const isLive = useGraphs().live.value;

    // node ids of the previous draw
    const drawn = useRef<Set<string> | null>(null);
    const layoutWorker = useRef<Worker | null>(null);

    // the worker outlives a single draw, a jump mid layout throws it away
    useEffect(() => () => layoutWorker.current?.terminate(), []);

    // rerender when changed
    const names = activeNames.value;

    const chipWidth = graph
        ? chipWidthFor(graph.nodes)
        : implicationChart.nodeWidth;
    const layoutOptions: LayoutOptions = {
        nodeWidth:
            chipWidth + implicationChart.boxWidth - implicationChart.nodeWidth,
    };

    const select = useRef(onSelect);
    select.current = onSelect;

    useEffect(() => {
        const svgEl = svgRef.current;

        if (!svgEl || !boxEl || !graph) {
            return;
        }

        const draw = ({ nodes, edges, width, height }: GraphLayout) => {
            // animate newNode
            const newNode = isLive ? enteringNode(nodes, drawn.current) : null;
            drawn.current = new Set(nodes.map((n) => n.id));
            const isNewEdge = (d: RoutedEdge) =>
                newNode != null &&
                (d.target === newNode.id || d.source === newNode.id);

            const isDeferredGraph = nodes.length >= implicationChart.deferNodes;

            const animateEnter = (s: any) =>
                s.transition("enter").duration(enterMs).ease(d3.easeCubicOut);

            const layer = createSvgCanvas(svgEl, width, height, {
                arrowMarker: !isDeferredGraph,
                scaleExtent: implicationChart.scaleExtent,
            });

            const lineGen = d3
                .line()
                .x((p: Point) => p.x)
                .y((p: Point) => p.y)
                .curve(d3.curveBasis);

            const midOf = (e: RoutedEdge) => e.points[e.points.length >> 1];

            const edge = layer
                .append("g")
                .attr("class", cn("fill-none", colors.implicationEdge))
                .selectAll("path")
                .data(edges)
                .join("path")
                .attr("stroke-width", 1.5)
                .attr("opacity", (d: RoutedEdge) =>
                    isNewEdge(d) ? 0 : edgeOpacity,
                )
                .attr("marker-end", isDeferredGraph ? null : "url(#arrow)")
                .attr("d", (d: RoutedEdge) => lineGen(d.points));

            const edgeLabel = layer
                .append("g")
                .attr("class", cn(colors.edgeLabel, "font-mono cursor-pointer"))
                .selectAll("text")
                .data(isDeferredGraph ? [] : edges)
                .join("text")
                .attr("font-size", 9)
                .attr("text-anchor", "middle")
                .attr("opacity", (d: RoutedEdge) =>
                    isNewEdge(d) ? 0 : edgeLabelOpacity,
                )
                .attr("x", (d: RoutedEdge) => midOf(d).x)
                .attr("y", (d: RoutedEdge) => midOf(d).y - 1)
                .text(
                    (d: RoutedEdge) =>
                        d.clauseId != null && d.clauseId >= 0
                            ? `c${d.clauseId}`
                            : "", // an edge with no permanent clause behind it is unlabelled, this should not happen
                )
                .on("click", (event: Event, d: RoutedEdge) => {
                    if (d.clauseId == null || d.clauseId < 0) {
                        return;
                    }
                    event.stopPropagation();
                    view.revealClause(d.clauseId);
                });

            const node = layer
                .append("g")
                .selectAll("g")
                .data(nodes)
                .join("g")
                .attr("class", (d: PositionedNode) =>
                    clickable(d) ? "cursor-pointer" : null,
                )
                .attr(
                    "transform",
                    (d: PositionedNode) => `translate(${d.x},${d.y})`,
                )
                .on("click", (event: Event, d: PositionedNode) => {
                    if (!clickable(d)) {
                        return;
                    }

                    event.stopPropagation();
                    select.current(d.eventIndex);
                });

            node.each(function (this: SVGGElement, d: PositionedNode) {
                drawImplicationNode(d3.select(this), d, chipWidth);
            });

            const newMaterializedNode = node
                .filter((d: PositionedNode) => d.id === newNode?.id)
                .attr("opacity", 0)
                .attr(
                    "transform",
                    (d: PositionedNode) =>
                        `translate(${d.x},${d.y}) scale(0.75)`,
                );
            animateEnter(newMaterializedNode)
                .attr("opacity", 1)
                .attr(
                    "transform",
                    (d: PositionedNode) => `translate(${d.x},${d.y}) scale(1)`,
                );
            animateEnter(edge.filter(isNewEdge)).attr("opacity", edgeOpacity);
            animateEnter(edgeLabel.filter(isNewEdge)).attr(
                "opacity",
                edgeLabelOpacity,
            );

            const neighbourhood = (id: string) => {
                const near = new Set([id]);

                for (const e of edges) {
                    if (e.source === id) {
                        near.add(e.target);
                    } else if (e.target === id) {
                        near.add(e.source);
                    }
                }

                return near;
            };

            // a transition over thousands of elements janks on every hover
            const fade = (s: any) =>
                isDeferredGraph
                    ? s
                    : s
                          .transition("focus")
                          .duration(fadeMs)
                          .ease(d3.easeCubicInOut);

            const focus = (d: PositionedNode | null) => {
                if (!d) {
                    fade(node).attr("opacity", 1);
                    fade(edge).attr("opacity", edgeOpacity);
                    fade(edgeLabel).attr("opacity", edgeLabelOpacity);
                    return;
                }

                const near = neighbourhood(d.id);
                const incident = (e: RoutedEdge) =>
                    e.source === d.id || e.target === d.id;

                fade(node).attr("opacity", (n: PositionedNode) =>
                    near.has(n.id) ? 1 : dimmed,
                );
                fade(edge).attr("opacity", (e: RoutedEdge) =>
                    incident(e) ? 1 : dimmed,
                );
                fade(edgeLabel).attr("opacity", (e: RoutedEdge) =>
                    incident(e) ? 1 : dimmed,
                );
            };

            // hover
            node.on(
                "pointerenter",
                function (
                    this: SVGGElement,
                    _: PointerEvent,
                    d: PositionedNode,
                ) {
                    const rect = this.getBoundingClientRect();
                    const container = boxEl.getBoundingClientRect();

                    focus(d);
                    setHover({
                        node: d,
                        x: rect.left + rect.width / 2 - container.left,
                        y: rect.top + rect.height / 2 - container.top,
                    });
                },
            ).on("pointerleave", () => {
                focus(null);
                setHover(null);
            });
        };

        // only spinner if drawin is async
        if (graph.nodes.length < implicationChart.deferNodes) {
            setDrawing(false);
            draw(layoutImplicationGraph(graph, layoutOptions));
            return () => setHover(null);
        }

        d3.select(svgEl).selectAll("*").remove();
        setHover(null);
        setDrawing(true);

        const worker = (layoutWorker.current ??= new LayoutWorker());

        let pending = true;

        requestLayoutFromWorker(worker, graph, layoutOptions).then((layout) => {
            pending = false;
            draw(layout);
            setDrawing(false);
        });

        return () => {
            // stop worker
            if (pending) {
                worker.terminate();
                layoutWorker.current = null;
            }
            setHover(null);
        };
    }, [graph, isLive, boxEl, chipWidth, names]);

    if (!graph) {
        return null;
    }

    return (
        <div class="flex min-h-0 flex-1 flex-col">
            <div ref={box} class="relative min-h-0 flex-1">
                <svg
                    ref={svgRef}
                    class="setiv-canvas bg-setiv-surface absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
                />

                {drawing && (
                    <div class="absolute inset-0 grid place-items-center">
                        <div class="border-base-content/15 border-t-base-content/50 loading loading-spinner loading-md size-8 border-4" />
                    </div>
                )}

                {hover && (
                    <HoverCard
                        x={hover.x}
                        y={hover.y}
                        containerWidth={size.width}
                    >
                        <NodeTooltip node={hover.node} state={state} />
                    </HoverCard>
                )}
            </div>

            <Legend items={implicationLegend} />
        </div>
    );
}
