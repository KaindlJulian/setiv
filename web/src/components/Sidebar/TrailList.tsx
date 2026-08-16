import { useDismissOnOutside } from "@/hooks/useDismissOnOutside";
import { useRevealRow } from "@/hooks/useRevealRow";
import { useRowVirtualizer } from "@/hooks/useRowVirtualizer";
import { cn } from "@/lib/cn";
import { litLabel, trailReason } from "@/lib/format";
import type { EventOf, SolverEvent } from "@/model/events";
import type { SolverState } from "@/model/trail";
import { useCursor, useSource, useView } from "@/state/context";
import { buildTrailRows } from "@/view/trailRows";
import { useMemo, useRef } from "preact/hooks";

const rowHeight = 20;

type Assignment = EventOf<"decide"> | EventOf<"propagate">;

/** The event `index` assigned with, or null when it assigned nothing. */
function assignmentAt(
    events: readonly SolverEvent[] | undefined,
    index: number,
): Assignment | null {
    const ev = events?.[index];

    if (!ev) {
        return null;
    }

    return ev.event === "decide" || ev.event === "propagate" ? ev : null;
}

export function TrailList({ state }: { state: SolverState }) {
    const view = useView();
    const cursor = useCursor();
    const run = useSource().run.value;
    const selected = view.selectedEvent.value;

    const { rows, rowOf } = useMemo(
        () => buildTrailRows(state.trail),
        [state.trail],
    );

    const virtualizer = useRowVirtualizer(rows.length, rowHeight, {
        follow: true,
    });

    // Revealing an event also opens this section, which takes a moment to
    // expand: nothing to scroll to until then, and nothing while it is closed.
    const open = view.sidebarSection.value === "trail";
    const revealed =
        (open && selected !== null ? rowOf.get(selected) : undefined) ?? null;

    useRevealRow(virtualizer, revealed);

    const offTrail =
        selected !== null && !rowOf.has(selected)
            ? assignmentAt(run?.events, selected)
            : null;

    const bannerRef = useRef<HTMLDivElement>(null);

    useDismissOnOutside(bannerRef, offTrail !== null, () => view.select(null));

    const banner = offTrail && selected !== null && (
        <div
            ref={bannerRef}
            class="border-base-300 bg-base-100 flex shrink-0 items-center gap-2 border-b px-2 py-1 text-[11px]"
        >
            <span class="text-base-content font-mono font-semibold">
                {litLabel(offTrail.literal)} @{offTrail.level}
            </span>
            <span class="text-base-content/60 flex-1 truncate">
                not assigned at this step
            </span>
            <button
                type="button"
                onClick={() => cursor.jumpTo(selected)}
                class="btn btn-xs font-mono"
            >
                jump to #{selected}
            </button>
        </div>
    );

    if (rows.length === 0) {
        return (
            <div class="flex h-full min-h-0 flex-col">
                {banner}
                <p class="text-base-content/40 px-2 py-2 text-xs">
                    Nothing assigned at this step.
                </p>
            </div>
        );
    }

    const rendered = [];

    for (const item of virtualizer.items) {
        const row = rows[item.index];

        if (row.kind === "divider") {
            rendered.push(
                <div
                    key={row.key}
                    class="text-base-content/40 flex h-5 items-center gap-2 border-l-2 border-transparent px-2 text-[11px]"
                >
                    <span class="font-mono">@{row.level}</span>
                    <span class="bg-base-300 h-px flex-1" />
                </div>,
            );
            continue;
        }

        const { entry } = row;
        const current = entry.eventIndex === selected;

        rendered.push(
            <div
                key={row.key}
                //onClick={() => view.select(entry.eventIndex)}
                class={cn(
                    "flex h-5 cursor-pointer items-center gap-2 border-l-2 px-2 font-mono text-xs whitespace-nowrap",
                    current
                        ? "border-primary bg-primary/20"
                        : "hover:bg-base-300 border-transparent",
                )}
            >
                <span class="text-setiv-true w-12 shrink-0 text-right">
                    {entry.lit}
                </span>
                <span class="text-base-content/40 w-8 shrink-0">
                    @{entry.level}
                </span>
                <span
                    class={
                        entry.isDecision
                            ? "text-setiv-decision font-semibold"
                            : "text-base-content/50"
                    }
                >
                    {trailReason(entry)}
                </span>
            </div>,
        );
    }

    return (
        <div class="flex h-full min-h-0 flex-col">
            {banner}

            <div
                ref={virtualizer.ref}
                class="min-h-0 flex-1 overflow-x-auto overflow-y-auto"
            >
                <div style={{ height: virtualizer.topPad }} />
                {rendered}
                <div style={{ height: virtualizer.bottomPad }} />
            </div>
        </div>
    );
}
