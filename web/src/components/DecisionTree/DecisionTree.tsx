import * as d3 from "d3";
import { useEffect, useRef } from "preact/hooks";
import { cn } from "@/lib/cn";
import { treeNodeLabel } from "@/lib/format";
import type { DecisionTree as Tree, TreeScope } from "@/model/decisionTree";
import {
    layoutDecisionTree,
    type TreeLayoutEdge,
    type TreeLayoutNode,
} from "@/view/layout/treeLayout";
import { createSvgCanvas } from "@/view/svgCanvas";
import { colors, treeChart } from "@/view/theme";
import { Legend, type LegendItem } from "@/components/Legend";

const decisionEdge: LegendItem = {
    shape: "line",
    label: "decision",
    stroke: colors.treeEdge,
};

const propagationEdge: LegendItem = {
    shape: "line",
    dashed: true,
    label: "propagation",
    stroke: colors.treeEdge,
};

const impliedNode: LegendItem = {
    shape: "circle",
    label: "+N = decision with BCP collapsed",
    fill: colors.node,
};

function legendFor(scope: TreeScope): LegendItem[] {
    return scope === "full"
        ? [decisionEdge, propagationEdge]
        : [decisionEdge, propagationEdge, impliedNode];
}

interface Props {
    tree: Tree | null;
    onExpand(key: string): void;
}

export function DecisionTree({ tree, onExpand }: Props) {
    const ref = useRef<SVGSVGElement>(null);
    const expand = useRef(onExpand);
    expand.current = onExpand;

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
            d.target.node.kind === "conflict" ||
            d.target.node.kind === "collapsed";

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
            )
            .attr("class", (d: TreeLayoutNode) =>
                d.node.kind === "collapsed" ? "cursor-pointer" : null,
            )
            .on("click", (event: Event, d: TreeLayoutNode) => {
                if (d.node.kind !== "collapsed") {
                    return;
                }
                event.stopPropagation();
                expand.current(d.node.key);
            });

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
                return;
            }

            if (d.node.kind === "collapsed") {
                sel.append("circle")
                    .attr("r", r + 1)
                    .attr("stroke-width", 1.5)
                    .attr("stroke-dasharray", "3 2")
                    .attr("class", cn(colors.none, colors.treeEdge));
                sel.append("text")
                    .attr("text-anchor", "middle")
                    .attr("dy", 4)
                    .attr("font-size", 12)
                    .attr("class", colors.treeLabel)
                    .text("+");
                return;
            }

            sel.append("circle")
                .attr("r", r)
                .attr("class", cn(colors.node, "stroke-setiv-surface"));
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
            <Legend items={legendFor(tree.scope)} />
        </div>
    );
}
