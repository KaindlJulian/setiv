/**
 * Color is expressed as Tailwind utility classes defined in index.css, and the
 * charts apply them with .attr("class", ...)
 */
export const colors = {
    chartLine: "stroke-setiv-decision",
    chartBand: "fill-setiv-decision",
    chartRestart: "stroke-setiv-learned",
    chartConflict: "fill-setiv-conflict",
    chartCursor: "stroke-setiv-ink",
    node: "fill-setiv-node",
    nodeLabel: "fill-setiv-node-label",
    decisionStroke: "stroke-setiv-decision",
    decisionAccent: "fill-setiv-decision",
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
    /** the drawn chip: a literal cell and a level cell */
    nodeWidth: 58,
    nodeHeight: 24,
    /** x of the rule between the two cells */
    nodeDivider: 9,
    nodeRadius: 5, // corner radius
    /** the box dagre reserves: the chip plus breathing room */
    boxWidth: 66,
    boxHeight: 32,
    nodesep: 20,
    ranksep: 74,
    margin: 20,
    scaleExtent: [0.1, 100] as [number, number],
} as const;

export const treeChart = {
    nodeRadius: 7,
    nodeSize: [46, 120], // [separation between siblings, separation between depths]
    margin: 30,
    labelPad: 140,
    scaleExtent: [0.1, 500] as [number, number],
    /** how many nodes a single synchronous d3 pass is allowed to draw */
    maxNodes: 1200,
} as const;

export const levelChart = {
    margin: { top: 12, right: 16, bottom: 40, left: 56 },
    minHeight: 220,
    strokeWidth: 2,
    /** Opacity of the min/max envelope */
    bandOpacity: 0.45,
    markerRadius: 4,
    scaleExtent: [1, 5000] as [number, number],
    maxRestartMarks: 100,
} as const;
