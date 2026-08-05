import type { Point } from "@dagrejs/dagre";
import * as d3 from "d3";
import { useEffect, useRef } from "preact/hooks";
import { cn } from "../lib/cn";
import { litLabel } from "../lib/format";
import type { ImplicationGraph as Graph } from "../model/implicationGraph";
import {
    layoutImplicationGraph,
    type PositionedNode,
    type RoutedEdge,
} from "../view/layout/implicationLayout";
import { createSvgCanvas } from "../view/svgCanvas";
import { colors, implicationChart } from "../view/theme";
import { Legend, type LegendItem } from "./Legend";

const legend: LegendItem[] = [
    { shape: "circle", label: "propagated", fill: colors.node },
    {
        shape: "circle",
        label: "decision (outlined)",
        fill: "fill-none",
        stroke: colors.decisionStroke,
    },
    { shape: "circle", label: "on learned clause", fill: colors.learned },
    { shape: "diamond", label: "κ conflict", fill: colors.conflict },
];

const fillOf = (d: PositionedNode) =>
    d.isConflict
        ? colors.conflict
        : d.onLearnedClause
          ? colors.learned
          : colors.node;

const labelFillOf = (d: PositionedNode) =>
    d.isConflict
        ? colors.conflictLabel
        : d.onLearnedClause
          ? colors.learnedLabel
          : colors.nodeLabel;

export function ImplicationGraph({ graph }: { graph: Graph | null }) {
    const ref = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svgEl = ref.current;
        if (!svgEl || !graph) {
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

        layer
            .append("g")
            .attr(
                "class",
                cn("fill-none", "opacity-50", colors.implicationEdge),
            )
            .selectAll("path")
            .data(edges)
            .join("path")
            .attr("stroke-width", 1.5)
            .attr("marker-end", "url(#arrow)")
            .attr("d", (d: RoutedEdge) => lineGen(d.points));

        layer
            .append("g")
            .attr("class", colors.edgeLabel)
            .selectAll("text")
            .data(edges)
            .join("text")
            .attr("font-size", 9)
            .attr("text-anchor", "middle")
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
            .attr(
                "transform",
                (d: PositionedNode) => `translate(${d.x},${d.y})`,
            );

        node.each(function (this: SVGGElement, d: PositionedNode) {
            const sel = d3.select(this);
            const r = implicationChart.nodeRadius;

            if (d.isConflict) {
                sel.append("rect")
                    .attr("x", -r)
                    .attr("y", -r)
                    .attr("width", 2 * r)
                    .attr("height", 2 * r)
                    .attr("transform", "rotate(45)")
                    .attr("class", fillOf(d));
            } else {
                sel.append("circle")
                    .attr("r", r)
                    .attr("stroke-width", 2)
                    .attr(
                        "class",
                        cn(
                            fillOf(d),
                            d.isDecision
                                ? colors.decisionStroke
                                : "stroke-none",
                        ),
                    );
            }
        });

        node.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", 4)
            .attr("font-size", 11)
            .attr("font-weight", 600)
            .attr("pointer-events", "none")
            .attr("class", labelFillOf)
            .text((d: PositionedNode) =>
                d.isConflict ? "κ" : litLabel(d.lit!),
            );

        node.append("text")
            .attr("text-anchor", "middle")
            .attr("dx", 20)
            .attr("dy", 4)
            .attr("font-size", 9)
            .attr("pointer-events", "none")
            .attr("class", colors.levelBadge)
            .text((d: PositionedNode) => `@${d.level}`);
    }, [graph]);

    if (!graph) {
        return null;
    }

    return (
        <div class="flex min-h-0 flex-1 flex-col">
            <svg
                ref={ref}
                class="setiv-canvas bg-setiv-surface min-h-0 w-full flex-1 cursor-grab active:cursor-grabbing"
            />
            <Legend items={legend} />
        </div>
    );
}
