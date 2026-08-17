import * as d3 from "d3";
import { colors } from "./theme";

export type Selection = any;

export interface SvgCanvasOptions {
    scaleExtent?: [number, number];
    /** Define an `#arrow` marker usable via `marker-end="url(#arrow)"`. */
    arrowMarker?: boolean;
}

/**
 * Reset `svgEl` and return the zoomable `<g>` layer to draw into.
 *
 * Everything drawn into the returned layer is discarded on the next call.
 */
export function createSvgCanvas(
    svgEl: SVGSVGElement,
    width: number,
    height: number,
    options: SvgCanvasOptions = {},
): Selection {
    const { scaleExtent = [0.1, 100], arrowMarker = false } = options;

    const svg = d3.select(svgEl);
    // Charts are redrawn on every step, so the view has to survive the wipe.
    const transform = d3.zoomTransform(svgEl);

    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    if (arrowMarker) {
        svg.append("defs")
            .append("marker")
            .attr("id", "arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 6)
            .attr("refY", 0)
            .attr("markerWidth", 4)
            .attr("markerHeight", 4)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("class", colors.arrow);
    }

    const layer = svg.append("g");

    const zoom = d3
        .zoom()
        .scaleExtent(scaleExtent)
        .on("zoom", (event: { transform: unknown }) =>
            layer.attr("transform", event.transform),
        );

    svg.call(zoom).call(zoom.transform, transform);

    return layer;
}
