import * as d3 from "d3";
import type { DecisionTree, TreeNode } from "@/model/decisionTree";
import { treeChart } from "@/view/theme";

export interface TreeLayoutNode {
    node: TreeNode;
    x: number;
    y: number;
}

export interface TreeLayoutEdge {
    source: TreeLayoutNode;
    target: TreeLayoutNode;
}

export interface TreeLayout {
    nodes: TreeLayoutNode[];
    edges: TreeLayoutEdge[];
    width: number;
    height: number;
}

export function layoutDecisionTree(
    tree: DecisionTree,
    depthSep: number = treeChart.nodeSize[1],
): TreeLayout {
    const { nodeSize, margin, labelPad } = treeChart;

    const root = d3.hierarchy(tree.root, (d: TreeNode) => d.children);
    d3.tree().nodeSize([nodeSize[0], depthSep])(root);

    // d3.tree lays out top-down:
    // `x` separates siblings, `y` is the depth axis.
    // the two axes swap on screen.
    const laid: { x: number; y: number; data: TreeNode }[] = root.descendants();

    let minSibling = Infinity;
    let maxSibling = -Infinity;
    let maxDepth = 0;

    for (const h of laid) {
        minSibling = Math.min(minSibling, h.x);
        maxSibling = Math.max(maxSibling, h.x);
        maxDepth = Math.max(maxDepth, h.y);
    }

    const nodes: TreeLayoutNode[] = [];
    const byData = new Map<TreeNode, TreeLayoutNode>();

    for (const h of laid) {
        const positioned: TreeLayoutNode = {
            node: h.data,
            x: h.y + margin,
            y: h.x - minSibling + margin,
        };
        nodes.push(positioned);
        byData.set(h.data, positioned);
    }

    const edges: TreeLayoutEdge[] = root
        .links()
        .map(
            (l: {
                source: { data: TreeNode };
                target: { data: TreeNode };
            }) => ({
                source: byData.get(l.source.data)!,
                target: byData.get(l.target.data)!,
            }),
        );

    return {
        nodes,
        edges,
        width: maxDepth + margin + Math.max(labelPad, depthSep),
        height: maxSibling - minSibling + 2 * margin,
    };
}
