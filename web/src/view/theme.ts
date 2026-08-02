const svgPalette = {
    node: "color-slate-500",
    decisionStroke: "color-zinc-800",
    learned: "color-orange-500",
    conflict: "color-red-600",
    implicationEdge: "color-neutral-400",
    edgeLabel: "color-neutral-500",
    arrow: "color-neutral-500",
    treeEdge: "color-slate-600",
    backtrackedEdge: "color-slate-300",
    backtrackedLabel: "color-slate-400",
    nodeLabel: "color-white",
    treeLabel: "color-slate-800",
    levelBadge: "color-neutral-600",
} as const;

export const cssColors = {
    ...(Object.fromEntries(
        Object.entries(svgPalette).map(([k, v]) => [k, `var(--${v})`]),
    ) as Record<keyof typeof svgPalette, string>),
    transparent: "transparent",
};

export const resultClass = {
    sat: "text-green-600",
    unsat: "text-red-600",
    unknown: "text-gray-600",
} as const;

export const literalClass = {
    "1": "text-emerald-700",
    "-1": "text-rose-600",
    "0": "text-gray-400",
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
    height: 560,
    nodeRadius: 7,
    nodeSize: [46, 120], // [separation between siblings, separation between depths]
    margin: 30,
    labelPad: 140,
    scaleExtent: [0.2, 3] as [number, number],
} as const;
