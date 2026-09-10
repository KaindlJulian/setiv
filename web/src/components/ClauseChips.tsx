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
    class?: string;
    watched?: readonly number[];
    unwatched?: readonly number[];
}

export function ClauseChips({
    literals,
    valueOf,
    max = defaultMax,
    class: className,
    watched,
    unwatched,
}: Props) {
    const shown = literals.slice(0, max);

    return (
        <div class={cn("mt-1 flex flex-wrap gap-1 font-mono", className)}>
            {shown.map((lit, i) => (
                <span
                    key={i}
                    class={cn(
                        "bg-base-200 rounded px-1",
                        valueClass(valueOf(lit)),
                        watched?.includes(lit) && "ring-primary ring-1",
                        unwatched?.includes(lit) &&
                            !watched?.includes(lit) &&
                            "outline-primary/60 outline-1 outline-dashed",
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
