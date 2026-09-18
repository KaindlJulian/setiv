import * as d3 from "d3";
import { useEffect, useRef, useState } from "preact/hooks";
import { cn } from "@/lib/cn";
import { treeNodeLabel } from "@/lib/format";
import type { DecisionTree as Tree, TreeNode } from "@/model/decisionTree";
import {
    layoutDecisionTree,
    type TreeLayoutEdge,
    type TreeLayoutNode,
} from "@/view/layout/treeLayout";
import { createSvgCanvas } from "@/view/svgCanvas";
import { colors, treeChart } from "@/view/theme";
import { HoverCard } from "@/components/HoverCard";
import { Legend, type LegendItem } from "@/components/Legend";
import { useElementSize } from "@/hooks/useElementSize";
import { TreeNodeTooltip } from "./TreeNodeTooltip";

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

function legendFor(folded: boolean): LegendItem[] {
    return folded
        ? [decisionEdge, propagationEdge, impliedNode]
        : [decisionEdge, propagationEdge];
}

const enterMs = 260;

function enteringNode(
    nodes: TreeLayoutNode[],
    drawn: ReadonlySet<string> | null,
): TreeLayoutNode | null {
    if (!drawn) {
        return null;
    }

    const keys = new Set(nodes.map((n) => n.node.key));

    for (const key of drawn) {
        if (!keys.has(key)) {
            return null;
        }
    }

    const fresh = nodes.filter((n) => !drawn.has(n.node.key));
    return fresh.length === 1 ? fresh[0] : null;
}

interface Hover {
    node: TreeNode;
    x: number;
    y: number;
}

interface Props {
    tree: Tree | null;
    onExpand(key: string): void;
    onSelect(node: TreeNode): void;
}

export function DecisionTree({ tree, onExpand, onSelect }: Props) {
    const ref = useRef<SVGSVGElement>(null);
    const [box, size, boxEl] = useElementSize<HTMLDivElement>();
    const [hover, setHover] = useState<Hover | null>(null);
    // node keys of the previous draw
    const drawn = useRef<Set<string> | null>(null);

    const expand = useRef(onExpand);
    expand.current = onExpand;
    const select = useRef(onSelect);
    select.current = onSelect;

    useEffect(() => {
        const svgEl = ref.current;

        if (!svgEl || !boxEl || !tree) {
            return;
        }

        const { nodes, edges, width, height } = layoutDecisionTree(tree);

        // animate newNode
        const newNode = enteringNode(nodes, drawn.current);
        drawn.current = new Set(nodes.map((n) => n.node.key));
        const animateEnter = (s: any) =>
            s.transition("enter").duration(enterMs).ease(d3.easeCubicOut);

        const layer = createSvgCanvas(svgEl, width, height, {
            scaleExtent: treeChart.scaleExtent,
        });

        const isImplied = (d: TreeLayoutEdge) =>
            d.target.node.kind === "propagation" ||
            d.target.node.kind === "conflict" ||
            d.target.node.kind === "collapsed";

        const link = layer
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
            })
            .attr("opacity", (d: TreeLayoutEdge) =>
                d.target.node.key === newNode?.node.key ? 0 : null,
            );

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
                d.node.kind === "root" ? null : "cursor-pointer",
            )
            .on("click", (event: Event, d: TreeLayoutNode) => {
                if (d.node.kind === "root") {
                    return;
                }

                event.stopPropagation();

                if (d.node.kind === "collapsed") {
                    expand.current(d.node.key);
                    return;
                }

                select.current(d.node);
            });

        g.on(
            "pointerenter",
            function (this: SVGGElement, _: PointerEvent, d: TreeLayoutNode) {
                const rect = this.getBoundingClientRect();
                const container = boxEl.getBoundingClientRect();

                setHover({
                    node: d.node,
                    x: rect.left + rect.width / 2 - container.left,
                    y: rect.top + rect.height / 2 - container.top,
                });
            },
        ).on("pointerleave", () => setHover(null));

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

        const newMaterializedNode = g
            .filter((d: TreeLayoutNode) => d.node.key === newNode?.node.key)
            .attr("opacity", 0)
            .attr(
                "transform",
                (d: TreeLayoutNode) => `translate(${d.x},${d.y}) scale(0.5)`,
            );
        animateEnter(newMaterializedNode)
            .attr("opacity", (d: TreeLayoutNode) =>
                d.node.isBacktracked ? 0.5 : 1,
            )
            .attr(
                "transform",
                (d: TreeLayoutNode) => `translate(${d.x},${d.y}) scale(1)`,
            );
        animateEnter(
            link.filter(
                (d: TreeLayoutEdge) => d.target.node.key === newNode?.node.key,
            ),
        ).attr("opacity", 1);

        g.append("text")
            .attr("x", -treeChart.nodeRadius)
            .attr("dy", 16)
            .attr("font-size", 11)
            .attr("class", (d: TreeLayoutNode) =>
                cn(colors.treeLabel, d.node.isBacktracked && "opacity-50"),
            )
            .text((d: TreeLayoutNode) => treeNodeLabel(d.node));

        return () => setHover(null);
    }, [tree, boxEl]);

    if (!tree) {
        return null;
    }

    return (
        <div class="flex min-h-0 flex-1 flex-col">
            <div ref={box} class="relative min-h-0 flex-1">
                <svg
                    ref={ref}
                    class="setiv-canvas bg-setiv-surface absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
                />

                {hover && (
                    <HoverCard
                        x={hover.x}
                        y={hover.y}
                        containerWidth={size.width}
                    >
                        <TreeNodeTooltip node={hover.node} />
                    </HoverCard>
                )}
            </div>

            <Legend items={legendFor(tree.foldPropagations)} />
        </div>
    );
}
