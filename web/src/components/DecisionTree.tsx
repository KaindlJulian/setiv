import * as d3 from "d3";
import { useEffect, useRef } from "preact/hooks";
import { cn } from "../lib/cn";
import { treeNodeLabel } from "../lib/format";
import { useSource } from "../state/context";
import {
    layoutDecisionTree,
    type TreeLayoutEdge,
    type TreeLayoutNode,
} from "../view/layout/treeLayout";
import { createSvgCanvas } from "../view/svgCanvas";
import { colors, treeChart } from "../view/theme";
import { Legend, type LegendItem } from "./Legend";

const legend: LegendItem[] = [
    {
        shape: "line",
        label: "decision (solid edge)",
        stroke: colors.treeEdge,
    },
    {
        shape: "line",
        label: "propagation (dashed edge)",
        stroke: colors.treeEdge,
        dashed: true,
    },
    { shape: "diamond", label: "conflict", fill: colors.conflict },
];

export function DecisionTree() {
    const source = useSource();
    const tree = source.run.value?.tree ?? null;
    const ref = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svgEl = ref.current;

        if (!svgEl || !tree) {
            return;
        }

        const { nodes, edges, width, height } = layoutDecisionTree(tree);

        const layer = createSvgCanvas(svgEl, width, height, {
            scaleExtent: treeChart.scaleExtent,
        });

        const isImplied = (d: TreeLayoutEdge) =>
            d.target.node.kind === "propagation" ||
            d.target.node.kind === "conflict";

        layer
            .append("g")
            .attr("class", "fill-none")
            .selectAll("path")
            .data(edges)
            .join("path")
            .attr("class", (d: TreeLayoutEdge) =>
                cn(
                    colors.treeEdge,
                    d.target.node.isBacktracked && "opacity-25",
                ),
            )
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", (d: TreeLayoutEdge) =>
                isImplied(d) ? "4 3" : null,
            )
            .attr("d", (d: TreeLayoutEdge) => {
                const mx = (d.source.x + d.target.x) / 2;
                return `M${d.source.x},${d.source.y} C${mx},${d.source.y} ${mx},${d.target.y} ${d.target.x},${d.target.y}`;
            });

        const g = layer
            .append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr(
                "transform",
                (d: TreeLayoutNode) => `translate(${d.x},${d.y})`,
            )
            .attr("opacity", (d: TreeLayoutNode) =>
                d.node.isBacktracked ? 0.5 : 1,
            );

        g.each(function (this: SVGGElement, d: TreeLayoutNode) {
            const sel = d3.select(this);
            const r = treeChart.nodeRadius;

            if (d.node.kind === "conflict") {
                sel.append("rect")
                    .attr("x", -r)
                    .attr("y", -r)
                    .attr("width", 2 * r)
                    .attr("height", 2 * r)
                    .attr("transform", "rotate(45)")
                    .attr("class", colors.conflict);
            } else {
                sel.append("circle")
                    .attr("r", r)
                    .attr("class", cn(colors.node, "stroke-setiv-surface"));
            }
        });

        g.append("text")
            .attr("x", -treeChart.nodeRadius)
            .attr("dy", 16)
            .attr("font-size", 11)
            .attr("class", (d: TreeLayoutNode) =>
                cn(colors.treeLabel, d.node.isBacktracked && "opacity-50"),
            )
            .text((d: TreeLayoutNode) => treeNodeLabel(d.node));
    }, [tree]);

    if (!tree) {
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
