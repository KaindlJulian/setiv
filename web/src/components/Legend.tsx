export interface LegendItem {
    shape: "circle" | "diamond" | "line";
    label: string;
    color?: string;
    stroke?: string;
    dashed?: boolean;
}

export function Legend({ items }: { items: LegendItem[] }) {
    return (
        <div class="my-1 flex flex-wrap gap-4 px-1 text-xs text-gray-600">
            {items.map((item) => (
                <span key={item.label} class="flex items-center gap-1">
                    <Swatch item={item} />
                    {item.label}
                </span>
            ))}
        </div>
    );
}

function Swatch({ item }: { item: LegendItem }) {
    if (item.shape === "line") {
        return (
            <svg width="20" height="8" aria-hidden="true">
                <line
                    x1="0"
                    y1="4"
                    x2="20"
                    y2="4"
                    stroke={item.color}
                    stroke-width="1.5"
                    stroke-dasharray={item.dashed ? "4 3" : undefined}
                />
            </svg>
        );
    }

    return (
        <span
            aria-hidden="true"
            class={
                item.shape === "circle"
                    ? "inline-block h-3 w-3 rounded-full"
                    : "inline-block h-2.5 w-2.5 rotate-45"
            }
            style={{
                background: item.color,
                border: item.stroke ? `2px solid ${item.stroke}` : undefined,
            }}
        />
    );
}
