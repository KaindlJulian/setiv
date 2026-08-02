import * as d3 from "d3";
import { useEffect, useRef } from "preact/hooks";
import { treeNodeLabel } from "../lib/format";
import { useSolverStore } from "../state/context";
import {
    layoutDecisionTree,
    type TreeLayoutEdge,
    type TreeLayoutNode,
} from "../view/layout/treeLayout";
import { createSvgCanvas } from "../view/svgCanvas";
import { cssColors, treeChart } from "../view/theme";
import { Legend, type LegendItem } from "./Legend";

const legend: LegendItem[] = [
    {
        shape: "line",
        label: "decision (solid edge)",
        color: cssColors.treeEdge,
    },
    {
        shape: "line",
        label: "propagation (dashed edge)",
        color: cssColors.treeEdge,
        dashed: true,
    },
    { shape: "diamond", label: "conflict", color: cssColors.conflict },
];

export function DecisionTree() {
    const store = useSolverStore();
    const tree = store.run.value?.tree ?? null;
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
            .attr("fill", "none")
            .selectAll("path")
            .data(edges)
            .join("path")
            .attr("stroke", (d: TreeLayoutEdge) =>
                d.target.node.isBacktracked
                    ? cssColors.backtrackedEdge
                    : cssColors.treeEdge,
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
                d.node.isBacktracked ? 0.45 : 1,
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
                    .attr("fill", cssColors.conflict);
            } else {
                sel.append("circle")
                    .attr("r", r)
                    .attr("fill", cssColors.node)
                    .attr("stroke", cssColors.nodeLabel)
                    .attr("stroke-width", 1);
            }
        });

        g.append("text")
            .attr("x", -treeChart.nodeRadius)
            .attr("dy", 16)
            .attr("font-size", 11)
            .attr("fill", (d: TreeLayoutNode) =>
                d.node.isBacktracked
                    ? cssColors.backtrackedLabel
                    : cssColors.treeLabel,
            )
            .text((d: TreeLayoutNode) => treeNodeLabel(d.node));

        g.append("title").text(
            (d: TreeLayoutNode) =>
                `${treeNodeLabel(d.node)}\nkind: ${d.node.kind}`,
        );
    }, [tree]);

    if (!tree) {
        return null;
    }

    return (
        <div class="w-full">
            <svg
                ref={ref}
                width="100%"
                height={treeChart.height}
                class="bg-white"
            />
            <Legend items={legend} />
        </div>
    );
}
