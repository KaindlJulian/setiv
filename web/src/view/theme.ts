/**
 * Colour is expressed as Tailwind utility classes defined in index.css, and the
 * charts apply them with .attr("class", ...)
 */
export const colors = {
    node: "fill-setiv-node",
    nodeLabel: "fill-setiv-node-label",
    decisionStroke: "stroke-setiv-decision",
    learned: "fill-setiv-learned",
    learnedLabel: "fill-setiv-learned-label",
    conflict: "fill-setiv-conflict",
    conflictLabel: "fill-setiv-conflict-label",
    implicationEdge: "stroke-setiv-ink",
    edgeLabel: "fill-setiv-ink",
    arrow: "fill-setiv-ink",
    levelBadge: "fill-setiv-ink",
    treeEdge: "stroke-setiv-ink",
    treeLabel: "fill-setiv-ink",
    backtrackedLabel: "fill-setiv-ink",
    none: "fill-none",
    noStroke: "stroke-none",
    sat: "badge-success",
    unsat: "badge-error",
    unknown: "badge-ghost",
    "1": "text-setiv-true",
    "-1": "text-setiv-false",
    "0": "text-base-content",
} as const;

export const implicationChart = {
    height: 460,
    nodeRadius: 13,
    nodeExtent: 30, // the box that dagre reserves
    nodesep: 24,
    ranksep: 60,
    margin: 20,
    scaleExtent: [0.1, 100] as [number, number],
} as const;

export const treeChart = {
    nodeRadius: 7,
    nodeSize: [46, 120], // [separation between siblings, separation between depths]
    margin: 30,
    labelPad: 140,
    scaleExtent: [0.1, 5] as [number, number],
} as const;
