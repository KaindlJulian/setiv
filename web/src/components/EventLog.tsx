import { useScaledRowWindow } from "@/hooks/useScaledRowWindow";
import { cn } from "@/lib/cn";
import type { SolverEvent } from "@/model/events";
import { useCursor, useSource } from "@/state/context";
import { useLayoutEffect } from "preact/hooks";

const rowHeight = 20;

const noEvents: readonly SolverEvent[] = [];

/**
 * The log as one row per event, rendered from `run.events`
 */
export function EventLog({ active }: { active: boolean }) {
    const cursor = useCursor();
    const events = useSource().run.value?.events ?? noEvents;
    const step = cursor.stepIndex.value;

    const window = useScaledRowWindow(events.length, rowHeight);

    // follow cursor
    useLayoutEffect(() => {
        if (active && !window.isRowVisible(step)) {
            window.scrollToRow(step);
        }
    }, [step, active]);

    if (events.length === 0) {
        return;
    }

    const rows = [];

    for (let i = window.start; i < window.end; i++) {
        const current = i === step;

        rows.push(
            <div
                key={i}
                onClick={() => cursor.jumpTo(i)}
                class={cn(
                    "flex h-5 cursor-pointer items-center gap-3 border-l-2 px-2 font-mono text-xs whitespace-nowrap",
                    current
                        ? "border-primary bg-base-300"
                        : "hover:bg-base-200 border-transparent",
                )}
            >
                <span class="text-base-content/40 w-14 shrink-0 text-right tabular-nums select-none">
                    {i}
                </span>
                <span
                    class={
                        current ? "text-base-content" : "text-base-content/80"
                    }
                >
                    {JSON.stringify(events[i])}
                </span>
            </div>,
        );
    }

    return (
        <div ref={window.ref} class="h-full overflow-auto">
            <div class="relative" style={{ height: window.surface }}>
                <div
                    class="absolute left-0 w-max min-w-full"
                    style={{ top: window.offset }}
                >
                    {rows}
                </div>
            </div>
        </div>
    );
}
