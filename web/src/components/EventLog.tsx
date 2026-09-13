import { useScaledRowWindow } from "@/hooks/useScaledRowWindow";
import { cn } from "@/lib/cn";
import type { SolverEvent } from "@/model/events";
import { useCursor, useSource, useView } from "@/state/context";
import { useEffect, useRef } from "preact/hooks";

const rowHeight = 20;

const noEvents: readonly SolverEvent[] = [];

/**
 * The log as one row per event, rendered from `run.events`
 */
export function EventLog({ active }: { active: boolean }) {
    const cursor = useCursor();
    const view = useView();
    const events = useSource().run.value?.events ?? noEvents;
    const step = cursor.stepIndex.value;

    const window = useScaledRowWindow(events.length, rowHeight);

    const latest = useRef(window);
    latest.current = window;
    const followed = useRef({ events: noEvents, step: -1 });

    // scroll to step
    useEffect(() => {
        const done = followed.current;

        if (!active || window.viewport === 0) {
            return;
        }

        if (done.events === events && done.step === step) {
            return;
        }

        followed.current = { events, step };

        if (!latest.current.isRowVisible(step)) {
            latest.current.scrollToRow(step);
        }
    }, [step, active, window.viewport]);

    if (events.length === 0 || window.viewport === 0) {
        return <div ref={window.ref} class="h-full overflow-auto" />;
    }

    const rows = [];

    for (let i = window.start; i < window.end; i++) {
        const current = i === step;

        rows.push(
            <div
                key={i}
                onClick={() => {
                    cursor.jumpTo(i);
                    view.revealTrailEnd();
                }}
                class={cn(
                    "flex h-5 cursor-pointer items-center gap-3 border-l-2 px-2 font-mono text-xs whitespace-nowrap",
                    current
                        ? "border-primary bg-primary/20"
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
                    {rowText(events[i])}
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

function rowText(ev: SolverEvent): string {
    switch (ev.event) {
        case "init":
            return JSON.stringify({
                event: ev.event,
                protocol_version: ev.protocol_version,
                variables: ev.variables,
                clauses: ev.clauses,
            });
        case "result":
            return JSON.stringify({ event: ev.event, result: ev.result });
        default:
            return JSON.stringify(ev);
    }
}
