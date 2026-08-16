import { eventStepBarText } from "@/lib/format";
import { useCursor, useSource } from "@/state/context";
import { tickPath } from "@/view/layout/chartLayout";
import type { LucideIcon } from "lucide-preact";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-preact";
import { useEffect, useMemo, useRef } from "preact/hooks";

const debounce_ms = 150;

export function StepBar() {
    const cursor = useCursor();
    const run = useSource().run.value;

    const dragging = useRef(false);
    const commitTimer = useRef<number | undefined>(undefined);

    const cancelPending = () => {
        clearTimeout(commitTimer.current);
        commitTimer.current = undefined;
    };

    const doCommit = () => {
        cancelPending();
        cursor.commitStep();
    };

    useEffect(() => {
        const endDrag = () => {
            if (!dragging.current) {
                return;
            }

            dragging.current = false;
            cancelPending();
            cursor.commitStep();
        };

        window.addEventListener("pointerup", endDrag);
        window.addEventListener("pointercancel", endDrag);

        return () => {
            window.removeEventListener("pointerup", endDrag);
            window.removeEventListener("pointercancel", endDrag);
            cancelPending();
        };
    }, [cursor]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowLeft":
                    e.ctrlKey ? cursor.stepToConflict(-1) : cursor.stepBy(-1);
                    break;
                case "ArrowRight":
                    e.ctrlKey ? cursor.stepToConflict(1) : cursor.stepBy(1);
                    break;
                default:
                    return;
            }

            e.preventDefault();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [cursor]);

    if (!run || run.events.length === 0) {
        return null;
    }

    const step = cursor.stepIndex.value;
    const max = cursor.maxStep.value;
    const conflictIndex = cursor.selectedConflictIndex.value;

    return (
        <div class="border-base-300 bg-base-100 flex shrink-0 flex-wrap items-center gap-3 border-b px-3 py-1.5">
            <div class="join">
                <Transport
                    Icon={ChevronsLeft}
                    title="Previous conflict (Ctrl + right arrow)"
                    onClick={() => cursor.stepToConflict(-1)}
                />
                <Transport
                    Icon={ChevronLeft}
                    title="Previous event (right arrow)"
                    onClick={() => cursor.stepBy(-1)}
                />
                <Transport
                    Icon={ChevronRight}
                    title="Next event (right arrow)"
                    onClick={() => cursor.stepBy(1)}
                />
                <Transport
                    Icon={ChevronsRight}
                    title="Next conflict (Ctrl + right arrow)"
                    onClick={() => cursor.stepToConflict(1)}
                />
            </div>

            <div class="relative flex grow">
                {run.conflicts.length < 200 && (
                    <Ticks pixels={1145} max={max} />
                )}
                <input
                    type="range"
                    min={0}
                    max={max}
                    value={step}
                    onPointerDown={() => {
                        dragging.current = true;
                        cancelPending();
                    }}
                    onInput={(e) => {
                        cursor.setStep(Number(e.currentTarget.value));

                        // A drag commits on release, never mid-gesture.
                        if (dragging.current) {
                            return;
                        }

                        cancelPending();
                        commitTimer.current = window.setTimeout(
                            () => cursor.commitStep(),
                            debounce_ms,
                        );
                    }}
                    onKeyUp={doCommit}
                    onBlur={doCommit}
                    class="range range-primary range-xs w-full"
                />
            </div>

            <div
                class="flex max-w-72 min-w-72 items-center justify-end gap-3 text-xs"
                title={eventStepBarText(cursor.currentEvent.value)}
            >
                <span class="text-base-content/70 font-mono font-bold whitespace-nowrap">
                    {step} / {max}
                </span>
                <span class="text-base-content/50 truncate font-mono">
                    {eventStepBarText(cursor.currentEvent.value)}
                </span>
                {conflictIndex >= 0 && (
                    <span class="badge badge-error badge-sm whitespace-nowrap">
                        κ #{conflictIndex}
                    </span>
                )}
            </div>
        </div>
    );
}

function Transport({
    Icon,
    title,
    onClick,
}: {
    Icon: LucideIcon;
    title: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            class="btn join-item btn-square btn-xs"
        >
            <Icon size={14} />
        </button>
    );
}

function Ticks({ max, pixels }: { max: number; pixels: number }) {
    const tickColumns = pixels;
    const tickHeight = 4;
    const run = useSource().run.value;

    const d = useMemo(
        () =>
            run ? tickPath(run.conflicts, max, tickColumns, tickHeight) : "",
        [run, max],
    );

    if (!d) {
        return null;
    }

    return (
        <svg
            aria-hidden="true"
            viewBox={`0 0 ${tickColumns} ${tickHeight}`}
            preserveAspectRatio="none"
            class="pointer-events-none absolute inset-x-0 top-1 h-2 w-full"
        >
            <path
                d={d}
                class="stroke-error/70 fill-none"
                stroke-width="1"
                vector-effect="non-scaling-stroke"
            />
        </svg>
    );
}
