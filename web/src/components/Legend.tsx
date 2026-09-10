import { cn } from "@/lib/cn";

export interface LegendItem {
    shape: "circle" | "diamond" | "line" | "chip";
    label: string;
    fill?: string;
    stroke?: string;
    dashed?: boolean;
    accent?: string;
}

export function Legend({ items }: { items: LegendItem[] }) {
    return (
        <div class="border-base-300 bg-base-200/60 text-base-content/70 flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-3 py-1.5 text-xs">
            {items.map((item) => (
                <span key={item.label} class="flex items-center gap-1.5">
                    <Swatch item={item} />
                    {item.label}
                </span>
            ))}
        </div>
    );
}

function Swatch({ item }: { item: LegendItem }) {
    if (item.shape === "chip") {
        return (
            <svg
                width="20"
                height="12"
                viewBox="-10 -6 20 12"
                aria-hidden="true"
                class="shrink-0"
            >
                <rect
                    x="-9"
                    y="-5"
                    width="18"
                    height="10"
                    rx="2"
                    class={cn(
                        item.fill,
                        item.stroke && "rounded-xs outline",
                        item.stroke,
                    )}
                />
                {item.accent && (
                    <rect
                        x="-8.5"
                        y="-4.5"
                        width="2.5"
                        height="9"
                        rx="1.25"
                        class={item.accent}
                    />
                )}
            </svg>
        );
    }

    if (item.shape === "line") {
        return (
            <svg width="20" height="10" aria-hidden="true" class="shrink-0">
                <line
                    x1="0"
                    y1="5"
                    x2="20"
                    y2="5"
                    class={cn("stroke-2", item.stroke)}
                    stroke-dasharray={item.dashed ? "4 3" : undefined}
                />
            </svg>
        );
    }

    return (
        <svg
            width="14"
            height="14"
            viewBox="-8 -8 16 16"
            aria-hidden="true"
            class="shrink-0"
        >
            {item.shape === "diamond" ? (
                <rect
                    x="-5"
                    y="-5"
                    width="10"
                    height="10"
                    transform="rotate(45)"
                    class={cn(item.fill, item.stroke)}
                />
            ) : (
                <circle
                    r="5.5"
                    class={cn("stroke-2", item.fill, item.stroke)}
                />
            )}
        </svg>
    );
}
