import * as d3 from "d3";
import { useEffect, useRef, useState } from "preact/hooks";
import { useElementSize } from "../hooks/useElementSize";
import { cn } from "../lib/cn";
import { eventStepBarText } from "../lib/format";
import { useSolverStore } from "../state/context";
import { decimateLevels, type LevelColumn } from "../view/layout/chartLayout";
import { colors, levelChart } from "../view/theme";

const tooltipWidth = 256;
const tooltipFlip = 60;

interface Hover {
    step: number;
    level: number;
    /** x position for tooltip */
    x: number;
    /** y position for tooltip */
    y: number;
}

/**
 * decision level (y) against event index (x)
 *
 * the "sawtooth" a CDCL search traces as it
 * dives on decisions and drops on backjumps and restarts.
 */
export function DecisionLevelChart() {
    const store = useSolverStore();
    const timeline = store.timeline.value;
    const run = store.run.value;

    const [box, size] = useElementSize<HTMLDivElement>();
    const svgRef = useRef<SVGSVGElement>(null);
    const [hover, setHover] = useState<Hover | null>(null);

    const { width, height } = size;

    useEffect(() => {
        const svgEl = svgRef.current;

        if (!svgEl || !timeline || width === 0 || height === 0) {
            return;
        }

        const { level, restartSteps, maxLevel } = timeline;
        const count = level.length;

        if (count === 0) {
            return;
        }

        const { margin } = levelChart;
        const innerW = Math.max(1, width - margin.left - margin.right);
        const innerH = Math.max(1, height - margin.top - margin.bottom);

        const svg = d3.select(svgEl);
        svg.selectAll("*").remove();
        svg.attr("width", width).attr("height", height);

        const x = d3
            .scaleLinear()
            .domain([0, Math.max(1, count - 1)])
            .range([0, innerW]);

        const y = d3
            .scaleLinear()
            .domain([0, Math.max(1, maxLevel)])
            .range([innerH, 0])
            .nice();

        const plot = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const gridY = plot.append("g").attr("class", "setiv-axis");
        const marks = plot.append("g");
        const band = plot
            .append("path")
            .attr("class", colors.chartBand)
            .attr("fill-opacity", levelChart.bandOpacity)
            .attr("stroke", "none");
        const line = plot
            .append("path")
            .attr("class", colors.chartLine)
            .attr("fill", "none")
            .attr("stroke-width", levelChart.strokeWidth)
            .attr("stroke-linejoin", "round");
        const gAxisX = plot
            .append("g")
            .attr("class", "setiv-axis")
            .attr("transform", `translate(0,${innerH})`);
        const gAxisY = plot.append("g").attr("class", "setiv-axis");
        const crosshair = plot.append("g").attr("display", "none");

        const cursorLine = crosshair
            .append("line")
            .attr("class", colors.chartCursor)
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3 3")
            .attr("opacity", 0.5)
            .attr("y1", 0)
            .attr("y2", innerH);

        const cursorDot = crosshair
            .append("circle")
            .attr("class", colors.chartLine)
            .attr("fill", "none")
            .attr("stroke-width", levelChart.strokeWidth)
            .attr("r", levelChart.markerRadius);

        // descrete ticks for levels
        const levelTicks = y
            .ticks(Math.max(2, Math.floor(innerH / 40)))
            .filter((t: number) => Number.isInteger(t));

        gAxisY.call(
            d3.axisLeft(y).tickValues(levelTicks).tickFormat(d3.format("d")),
        );

        gridY.call(
            d3
                .axisLeft(y)
                .tickValues(levelTicks)
                .tickSize(-innerW)
                .tickFormat(() => ""),
        );
        gridY.selectAll(".domain").remove();

        svg.append("text")
            .attr("class", "setiv-axis-title")
            .attr("text-anchor", "middle")
            .attr("x", margin.left + innerW / 2)
            .attr("y", height - 6)
            .text("event #");

        svg.append("text")
            .attr("class", "setiv-axis-title")
            .attr("text-anchor", "middle")
            .attr(
                "transform",
                `translate(12,${margin.top + innerH / 2}) rotate(-90)`,
            )
            .text("deicsion level");

        const stepLine = d3
            .line()
            .curve(d3.curveStepAfter)
            .y((d: LevelColumn) => y(d.max));

        const envelope = d3
            .area()
            .curve(d3.curveStepAfter)
            .y0((d: LevelColumn) => y(d.min))
            .y1((d: LevelColumn) => y(d.max));

        // current the scale the data is currently drawn against, zoom changes it
        let zx = x;
        let pointerX: number | null = null;

        const redraw = () => {
            const from = Math.floor(zx.invert(0));
            const to = Math.ceil(zx.invert(innerW));
            const series = decimateLevels(level, from, to, Math.round(innerW));

            const at = (d: LevelColumn) => zx(d.i);
            stepLine.x(at);
            envelope.x(at);

            line.attr("d", stepLine(series.columns));

            // flat stretch collapses the envelope to nothing
            band.attr("d", series.exact ? null : envelope(series.columns)).attr(
                "display",
                series.exact ? "none" : null,
            );

            gAxisX.call(
                d3
                    .axisBottom(zx)
                    .ticks(Math.max(2, Math.floor(innerW / 90)))
                    .tickFormat(d3.format("~s")),
            );

            const visibleRestarts: number[] = [];

            restartSteps.forEach((step) => {
                if (step >= from && step <= to) {
                    visibleRestarts.push(step);
                }
            });

            marks
                .selectAll("line")
                .data(
                    visibleRestarts.length > levelChart.maxRestartMarks
                        ? []
                        : visibleRestarts,
                )
                .join("line")
                .attr("class", colors.chartRestart)
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "2 4")
                .attr("opacity", 0.7)
                .attr("x1", (d: number) => zx(d))
                .attr("x2", (d: number) => zx(d))
                .attr("y1", 0)
                .attr("y2", innerH);
        };

        const showHover = (px: number) => {
            pointerX = px;

            const step = Math.max(
                0,
                Math.min(count - 1, Math.round(zx.invert(px))),
            );
            const value = level[step];
            const cx = zx(step);
            const cy = y(value);

            crosshair.attr("display", null);
            cursorLine.attr("x1", cx).attr("x2", cx);
            cursorDot.attr("cx", cx).attr("cy", cy);

            setHover({
                step,
                level: value,
                x: cx + margin.left,
                y: cy + margin.top,
            });
        };

        const hideHover = () => {
            pointerX = null;
            crosshair.attr("display", "none");
            setHover(null);
        };

        plot.append("rect")
            .attr("width", innerW)
            .attr("height", innerH)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("pointermove", (event: PointerEvent) =>
                showHover(d3.pointer(event, plot.node())[0]),
            )
            .on("pointerleave", hideHover);

        svg.call(
            d3
                .zoom()
                .scaleExtent(levelChart.scaleExtent)
                .extent([
                    [0, 0],
                    [innerW, innerH],
                ])
                .translateExtent([
                    [0, 0],
                    [innerW, innerH],
                ])
                .on(
                    "zoom",
                    (event: {
                        transform: { rescaleX(s: unknown): unknown };
                    }) => {
                        zx = event.transform.rescaleX(x) as typeof x;
                        redraw();
                        if (pointerX !== null) {
                            showHover(pointerX);
                        }
                    },
                ),
        );

        redraw();

        return () => hideHover();
    }, [timeline, width, height]);

    if (!timeline || timeline.level.length === 0) {
        return null;
    }

    const event = hover && run ? run.events[hover.step] : null;

    return (
        <div ref={box} class="relative min-h-0 flex-1">
            <svg
                ref={svgRef}
                class="setiv-canvas bg-setiv-surface block cursor-crosshair"
            />

            {hover && (
                <div
                    class={cn(
                        "border-base-300 bg-base-100 pointer-events-none absolute z-10 max-w-64 rounded border px-2 py-1 text-xs shadow-md",
                        // keep inside plot area
                        hover.y > tooltipFlip && "-translate-y-full",
                        hover.x > width - tooltipWidth && "-translate-x-full",
                    )}
                    style={{
                        left: `${hover.x + (hover.x > width - tooltipWidth ? -10 : 10)}px`,
                        top: `${hover.y + (hover.y > tooltipFlip ? -8 : 8)}px`,
                    }}
                >
                    <div class="font-mono">
                        #{hover.step} @{hover.level}
                    </div>
                    {event && (
                        <div class="text-base-content/60 font-mono">
                            {eventStepBarText(event)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
