import { ChevronRight } from "lucide-preact";
import { useRef } from "preact/hooks";
import { samples, type Sample } from "./samples";

interface SampleListProps {
    busy: boolean;
    onPick: (sample: Sample) => void; // file dialog
}

export function SampleList({ busy, onPick }: SampleListProps) {
    const details = useRef<HTMLDetailsElement>(null);

    const choose = (sample: Sample) => {
        if (details.current) {
            details.current.open = false;
        }
        onPick(sample);
    };

    return (
        <details ref={details} class="group min-w-0">
            <summary class="text-base-content/70 hover:text-base-content inline-flex cursor-pointer list-none items-center gap-1 text-xs">
                <ChevronRight
                    size={13}
                    class="transition-transform group-open:rotate-90"
                />
                Samples
            </summary>

            <ul class="border-base-300 divide-base-300 mt-3 divide-y rounded border text-xs">
                {samples.map((s) => (
                    <li key={s.file}>
                        <button
                            type="button"
                            onClick={() => choose(s)}
                            disabled={busy}
                            title={s.note}
                            class="hover:bg-base-200 flex w-full cursor-pointer items-baseline gap-2 px-2 py-1.5 text-left"
                        >
                            <span class="shrink-0 font-medium">{s.label}</span>
                            <span class="text-base-content/50 min-w-0 truncate">
                                {s.note}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </details>
    );
}
