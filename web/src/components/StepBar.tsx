import { useEffect } from "preact/hooks";
import { eventStepBarText } from "../lib/format";
import { useSolverStore } from "../state/context";

export function StepBar() {
    const store = useSolverStore();
    const run = store.run.value;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const active = document.activeElement;

            // The event log is a focusable textarea holding the whole file;
            // arrows there have to move the caret, not the cursor.
            if (
                active instanceof HTMLTextAreaElement ||
                active instanceof HTMLInputElement ||
                active instanceof HTMLSelectElement
            ) {
                return;
            }

            switch (e.key) {
                case "ArrowLeft":
                    e.shiftKey ? store.stepToConflict(-1) : store.stepBy(-1);
                    break;
                case "ArrowRight":
                    e.shiftKey ? store.stepToConflict(1) : store.stepBy(1);
                    break;
                default:
                    return;
            }

            e.preventDefault();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [store]);

    if (!run || run.events.length === 0) {
        return null;
    }

    const step = store.stepIndex.value;
    const max = store.maxStep.value;
    const conflictIndex = store.selectedConflictIndex.value;

    return (
        <div class="flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-300 bg-white px-3 py-2">
            <div class="flex items-center gap-1">
                <Transport
                    label="<"
                    title="Previous event"
                    onClick={() => store.stepBy(-1)}
                />
                <Transport
                    label=">"
                    title="Next event"
                    onClick={() => store.stepBy(1)}
                />
            </div>

            <div class="relative max-w-100 flex-1">
                <Ticks max={max} />
                <input
                    type="range"
                    min={0}
                    max={max}
                    value={step}
                    onInput={(e) =>
                        store.setStep(Number(e.currentTarget.value))
                    }
                    onChange={() => store.commitStep()}
                    class="relative w-full cursor-pointer"
                />
            </div>

            <div class="flex min-w-0 items-center gap-3 text-xs text-gray-600">
                <span class="font-mono whitespace-nowrap">
                    {step} / {max}
                </span>
                <span class="truncate font-mono text-gray-500">
                    {eventStepBarText(store.currentEvent.value)}
                </span>
                {conflictIndex >= 0 && (
                    <span class="whitespace-nowrap text-red-600">
                        conflict #{conflictIndex + 1}
                    </span>
                )}
            </div>
        </div>
    );
}

function Transport({
    label,
    title,
    onClick,
}: {
    label: string;
    title: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={title}
            onClick={onClick}
            class="cursor-pointer rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 hover:bg-gray-100"
        >
            {label}
        </button>
    );
}

function Ticks({ max }: { max: number }) {
    const store = useSolverStore();
    const run = store.run.value;

    if (!run || max <= 0) {
        return null;
    }

    return (
        <div class="pointer-events-none absolute inset-x-0 top-0 h-1.5">
            {run.conflicts.map((c) =>
                c.eventIndex <= max ? (
                    <span
                        key={c.index}
                        class="absolute top-0 h-1.5 w-px bg-red-400"
                        style={{ left: `${(c.eventIndex / max) * 100}%` }}
                    />
                ) : null,
            )}
        </div>
    );
}
