import { useVirtualList } from "../hooks/useVirtualList";
import { trailReason } from "../lib/format";
import type { SolverState, TrailEntry } from "../model/trail";

const rowHeight = 20;
const viewportHeight = 300;

type Row =
    | { kind: "divider"; level: number; key: string }
    | { kind: "entry"; entry: TrailEntry; key: string };

export function TrailList({ state }: { state: SolverState }) {
    const rows: Row[] = [];
    let previous: number | null = null;

    state.trail.forEach((entry, i) => {
        if (entry.level !== previous) {
            rows.push({
                kind: "divider",
                level: entry.level,
                key: `d${i}`,
            });
            previous = entry.level;
        }

        rows.push({ kind: "entry", entry, key: `e${i}` });
    });

    const window = useVirtualList(rows.length, rowHeight, viewportHeight);

    if (rows.length === 0) {
        return (
            <p class="px-2 py-2 text-xs text-gray-400">
                Nothing assigned at this step.
            </p>
        );
    }

    const rendered = [];

    for (let i = window.start; i < window.end; i++) {
        const row = rows[i];

        if (row.kind === "divider") {
            rendered.push(
                <div
                    key={row.key}
                    class="flex h-5 items-center gap-2 px-2 text-[11px] text-gray-400"
                >
                    <span class="font-mono">@{row.level}</span>
                    <span class="h-px flex-1 bg-gray-200" />
                </div>,
            );
            continue;
        }

        const { entry } = row;

        rendered.push(
            <div
                key={row.key}
                class="flex h-5 items-center gap-2 px-2 font-mono text-xs whitespace-nowrap hover:bg-gray-100"
            >
                <span class="w-12 shrink-0 text-right text-emerald-700">
                    {entry.lit}
                </span>
                <span class="w-8 shrink-0 text-gray-400">@{entry.level}</span>
                <span
                    class={entry.isDecision ? "text-zinc-800" : "text-gray-500"}
                >
                    {trailReason(entry)}
                </span>
            </div>,
        );
    }

    return (
        <div
            onScroll={window.onScroll}
            style={{
                height: Math.min(viewportHeight, rows.length * rowHeight),
            }}
            class="overflow-x-auto overflow-y-auto"
        >
            <div style={{ height: window.topPad }} />
            {rendered}
            <div style={{ height: window.bottomPad }} />
        </div>
    );
}
