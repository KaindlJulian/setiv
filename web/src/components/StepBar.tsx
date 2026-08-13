import type { LucideIcon } from "lucide-preact";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-preact";
import { useEffect, useMemo } from "preact/hooks";
import { eventStepBarText } from "@/lib/format";
import { useCursor, useSource } from "@/state/context";
import { tickPath } from "@/view/layout/chartLayout";

export function StepBar() {
    const cursor = useCursor();
    const run = useSource().run.value;

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

            <div class="relative max-w-100 min-w-40 flex-1">
                {run.conflicts.length < 200 && <Ticks max={max} />}
                <input
                    type="range"
                    min={0}
                    max={max}
                    value={step}
                    onInput={(e) =>
                        cursor.setStep(Number(e.currentTarget.value))
                    }
                    onChange={() => cursor.commitStep()}
                    class="range range-primary range-xs w-full"
                />
            </div>

            <div class="flex min-w-0 flex-1 items-center gap-3 text-xs">
                <span class="text-base-content/70 font-mono whitespace-nowrap">
                    {step} / {max}
                </span>
                <span class="text-base-content/50 truncate font-mono">
                    {eventStepBarText(cursor.currentEvent.value)}
                </span>
                {conflictIndex >= 0 && (
                    <span class="badge badge-error badge-sm whitespace-nowrap">
                        conflict #{conflictIndex + 1}
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

function Ticks({ max }: { max: number }) {
    const tickColumns = 600;
    const tickHeight = 6;
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
            class="pointer-events-none absolute inset-x-0 top-0 h-1.5 w-full"
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
