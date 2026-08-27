import { HoverCard } from "@/components/HoverCard";
import { Legend } from "@/components/Legend";
import { useElementSize } from "@/hooks/useElementSize";
import { cn } from "@/lib/cn";
import type { ImplicationGraph as Graph } from "@/model/implicationGraph";
import type { SolverState } from "@/model/trail";
import { drawImplicationNode, implicationLegend } from "@/view/implicationNode";
import {
    layoutImplicationGraph,
    type PositionedNode,
    type RoutedEdge,
} from "@/view/layout/implicationLayout";
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

interface Props {
    graph: Graph | null;
    state: SolverState;
    onSelect(eventIndex: number): void;
}

/** the conflict node is not an assignment, so there is nothing to select */
const clickable = (d: PositionedNode) => !d.isConflict;

export function ImplicationGraph({ graph, state, onSelect }: Props) {
    const [box, size] = useElementSize<HTMLDivElement>();
    const svgRef = useRef<SVGSVGElement>(null);
    const [hover, setHover] = useState<Hover | null>(null);

    const select = useRef(onSelect);
    select.current = onSelect;

    useEffect(() => {
        const svgEl = svgRef.current;
        const boxEl = box.current;

        if (!svgEl || !boxEl || !graph) {
            return;
        }

        const { nodes, edges, width, height } = layoutImplicationGraph(graph);

        const layer = createSvgCanvas(svgEl, width, height, {
            arrowMarker: true,
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
            .attr("opacity", edgeOpacity)
            .attr("marker-end", "url(#arrow)")
            .attr("d", (d: RoutedEdge) => lineGen(d.points));

        const edgeLabel = layer
            .append("g")
            .attr("class", colors.edgeLabel)
            .selectAll("text")
            .data(edges)
            .join("text")
            .attr("font-size", 9)
            .attr("text-anchor", "middle")
            .attr("opacity", edgeLabelOpacity)
            .attr("x", (d: RoutedEdge) => midOf(d).x)
            .attr("y", (d: RoutedEdge) => midOf(d).y)
            .text(
                (d: RoutedEdge) =>
                    d.clauseId != null && d.clauseId >= 0
                        ? `c${d.clauseId}`
                        : "", // an edge with no permanent clause behind it is unlabelled
            );

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
            drawImplicationNode(d3.select(this), d);
        });

        /** the hovered node plus everything one edge away from it */
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

        const fade = (s: any) =>
            s.transition("focus").duration(fadeMs).ease(d3.easeCubicInOut);

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

        node.on(
            "pointerenter",
            function (this: SVGGElement, _: PointerEvent, d: PositionedNode) {
                // The nodes is inside a zoomed layer under a viewBox, so the
                // layout coordinates are not screen coordinates.
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

        return () => setHover(null);
    }, [graph]);

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
