import type { Point } from "@dagrejs/dagre";
import * as d3 from "d3";
import { useEffect, useRef } from "preact/hooks";
import { clauseRef, clauseText, litLabel } from "../lib/format";
import type { ImplicationGraph as Graph } from "../model/implicationGraph";
import {
    layoutImplicationGraph,
    type PositionedNode,
    type RoutedEdge,
} from "../view/layout/implicationLayout";
import { createSvgCanvas } from "../view/svgCanvas";
import { cssColors, implicationChart } from "../view/theme";
import { Legend, type LegendItem } from "./Legend";

const legend: LegendItem[] = [
    {
        shape: "circle",
        label: "decision (black border)",
        color: cssColors.transparent,
        stroke: cssColors.decisionStroke,
    },
    { shape: "circle", label: "on learned clause", color: cssColors.learned },
    { shape: "diamond", label: "κ conflict", color: cssColors.conflict },
];

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

        const link = layer
            .append("g")
            .attr("fill", "none")
            .attr("stroke", cssColors.implicationEdge)
            .attr("stroke-opacity", 0.7)
            .selectAll("path")
            .data(edges)
            .join("path")
            .attr("stroke-width", 1.5)
            .attr("marker-end", "url(#arrow)")
            .attr("d", (d: RoutedEdge) => lineGen(d.points));

        const linkLabel = layer
            .append("g")
            .selectAll("text")
            .data(edges)
            .join("text")
            .attr("font-size", 9)
            .attr("fill", cssColors.edgeLabel)
            .attr("text-anchor", "middle")
            .attr("x", (d: RoutedEdge) => midOf(d).x)
            .attr("y", (d: RoutedEdge) => midOf(d).y)
            .text(
                (d: RoutedEdge) =>
                    d.clauseId != null && d.clauseId >= 0
                        ? `c${d.clauseId}`
                        : "", // an edge with no permanent clause behind it is left unlabelled
            );

        const node = layer
            .append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr(
                "transform",
                (d: PositionedNode) => `translate(${d.x},${d.y})`,
            )
            .style("cursor", "grab");

        const fillOf = (d: PositionedNode) =>
            d.isConflict
                ? cssColors.conflict
                : d.onLearnedClause
                  ? cssColors.learned
                  : cssColors.node;

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
                    .attr("fill", fillOf(d));
            } else {
                sel.append("circle")
                    .attr("r", r)
                    .attr("fill", fillOf(d))
                    .attr(
                        "stroke",
                        d.isDecision
                            ? cssColors.decisionStroke
                            : cssColors.transparent,
                    )
                    .attr("stroke-width", 1.5);
            }
        });

        node.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", 4)
            .attr("font-size", 11)
            .attr("font-weight", 600)
            .attr("fill", cssColors.nodeLabel)
            .attr("pointer-events", "none")
            .text((d: PositionedNode) =>
                d.isConflict ? "κ" : litLabel(d.lit!),
            );

        node.append("text")
            .attr("text-anchor", "middle")
            .attr("dx", 20)
            .attr("dy", 4)
            .attr("font-size", 9)
            .attr("fill", cssColors.levelBadge)
            .attr("pointer-events", "none")
            .text((d: PositionedNode) => `@${d.level}`);

        node.append("title").text((d: PositionedNode) =>
            d.isConflict
                ? `Conflict clause ${clauseRef(graph.conflict.clauseId)}: ${clauseText(graph.conflict.conflictLiterals)}`
                : `${litLabel(d.lit!)} @ level ${d.level} ${
                      d.isDecision ? "decision" : "propagated"
                  }${d.onLearnedClause ? "\n(on learned clause)" : ""}`,
        );
    }, [graph]);

    if (!graph) {
        return null;
    }

    return (
        <div class="w-full">
            <svg
                ref={ref}
                width="100%"
                height={implicationChart.height}
                class="bg-white"
            />
            <Legend items={legend} />
        </div>
    );
}
