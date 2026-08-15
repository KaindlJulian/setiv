import type { LegendItem } from "@/components/Legend";
import { cn } from "@/lib/cn";
import type { ImplicationNode } from "@/model/implicationGraph";
import type { Selection } from "@/view/svgCanvas";
import { colors, implicationChart } from "@/view/theme";

const { nodeWidth, nodeHeight, nodeDivider, nodeRadius } = implicationChart;

export const implicationLegend: LegendItem[] = [
    { shape: "chip", label: "propagated", fill: colors.node },
    {
        shape: "chip",
        label: "decision",
        fill: colors.node,
        accent: colors.decisionAccent,
    },
    { shape: "chip", label: "on learned clause", fill: colors.learned },
    { shape: "chip", label: "κ conflict", fill: colors.conflict },
];

export const kindOf = (d: ImplicationNode): string =>
    d.isConflict ? "conflict" : d.isDecision ? "decision" : "propagated";

/** Digits only: the sign is drawn as an overbar, not written out. */
export const magnitude = (d: ImplicationNode): string =>
    d.isConflict ? "κ" : String(Math.abs(d.lit!));

export const isNegative = (d: ImplicationNode): boolean =>
    !d.isConflict && d.lit! < 0;

/** `x2 = false`, what the overbar is shorthand for. */
export const assignmentText = (d: ImplicationNode): string =>
    d.isConflict ? "no assignment" : `x${Math.abs(d.lit!)} = ${d.lit! > 0}`;

export const fillOf = (d: ImplicationNode): string =>
    d.isConflict
        ? colors.conflict
        : d.onLearnedClause
          ? colors.learned
          : colors.node;

export const labelFillOf = (d: ImplicationNode): string =>
    d.isConflict
        ? colors.conflictLabel
        : d.onLearnedClause
          ? colors.learnedLabel
          : colors.nodeLabel;

/**
 * The overbar is a `<line>`, so it needs the stroke twin of the label's fill
 * class. Spelled out rather than derived, because Tailwind only emits classes
 * it can see literally in the source.
 */
const barStroke: Record<string, string> = {
    "fill-setiv-node-label": "stroke-setiv-node-label",
    "fill-setiv-learned-label": "stroke-setiv-learned-label",
    "fill-setiv-conflict-label": "stroke-setiv-conflict-label",
    "fill-setiv-ink": "stroke-setiv-ink",
};

/** The stroke twin of a label's fill class. */
export const strokeFor = (fillClass: string): string =>
    barStroke[fillClass] ?? "stroke-setiv-ink";

/**
 * Draws one node into its already translated `<g>`.
 *
 * A two-cell chip: the literal on the left, its decision level on the right.
 * Nothing floats outside the shape, and the aspect ratio suits the
 * left-to-right flow of the graph better than a circle does. Decisions get an
 * accent bar rather than an outline, which stays readable once the fill is
 * already warning-coloured.
 */
export function drawImplicationNode(sel: Selection, d: ImplicationNode): void {
    sel.append("rect")
        .attr("x", -nodeWidth / 2)
        .attr("y", -nodeHeight / 2)
        .attr("width", nodeWidth)
        .attr("height", nodeHeight)
        .attr("rx", nodeRadius)
        .attr("class", fillOf(d));

    sel.append("line")
        .attr("x1", nodeDivider)
        .attr("x2", nodeDivider)
        .attr("y1", -nodeHeight / 2 + 3)
        .attr("y2", nodeHeight / 2 - 3)
        .attr("stroke-width", 1)
        .attr("class", cn(strokeFor(labelFillOf(d)), "opacity-30"));

    if (d.isDecision) {
        sel.append("rect")
            .attr("x", -nodeWidth / 2 + 2)
            .attr("y", -nodeHeight / 2 + 2)
            .attr("width", 3.5)
            .attr("height", nodeHeight - 4)
            .attr("rx", 1.75)
            .attr("class", colors.decisionAccent);
    }

    overbarLabel(sel, d, {
        fontSize: 12,
        dy: 4,
        x: -10,
        class: labelFillOf(d),
    });

    sel.append("text")
        .attr("x", (nodeDivider + nodeWidth / 2) / 2 + 2)
        .attr("text-anchor", "middle")
        .attr("dy", 3.5)
        .attr("font-size", 9)
        .attr("pointer-events", "none")
        .attr("class", cn(labelFillOf(d), "opacity-75"))
        .text(d.level);
}

export function overbarLabel(
    sel: Selection,
    d: ImplicationNode,
    options: {
        fontSize: number;
        dy: number;
        class: string;
        x?: number;
        weight?: number;
    },
): void {
    const x = options.x ?? 0;

    const text = sel
        .append("text")
        .attr("text-anchor", "middle")
        .attr("x", x)
        .attr("dy", options.dy)
        .attr("font-size", options.fontSize)
        .attr("font-weight", options.weight ?? 600)
        .attr("pointer-events", "none")
        .attr("class", options.class)
        .text(magnitude(d));

    if (!isNegative(d)) {
        return;
    }

    const width = text.node().getComputedTextLength();

    const top = options.dy - options.fontSize * 0.71 - 2.5; // 0.71 feels right. todo: maybe theres a better way

    sel.append("line")
        .attr("x1", x - width / 2)
        .attr("x2", x + width / 2)
        .attr("y1", top)
        .attr("y2", top)
        .attr("stroke-width", 1.2)
        .attr("pointer-events", "none")
        .attr("class", strokeFor(options.class));
}
