import { cn } from "@/lib/cn";
import { litLabel } from "@/lib/format";
import type { Value } from "@/model/trail";

const defaultMax = 5;

const valueClass = (value: Value): string => {
    switch (value) {
        case 1:
            return "text-setiv-true";
        case -1:
            return "text-setiv-false";
        case 0:
            return "text-base-content/50";
    }
};

interface Props {
    literals: readonly number[];
    valueOf(lit: number): Value;
    max?: number;
}

export function ClauseChips({ literals, valueOf, max = defaultMax }: Props) {
    const shown = literals.slice(0, max);

    return (
        <div class="mt-1 flex flex-wrap gap-1 font-mono">
            {shown.map((lit, i) => (
                <span
                    key={i}
                    class={cn(
                        "bg-base-200 rounded px-1",
                        valueClass(valueOf(lit)),
                    )}
                >
                    {litLabel(lit)}
                </span>
            ))}

            {literals.length > max && (
                <span class="bg-base-200 text-base-content/50 rounded px-1">
                    +{literals.length - max}
                </span>
            )}
        </div>
    );
}
