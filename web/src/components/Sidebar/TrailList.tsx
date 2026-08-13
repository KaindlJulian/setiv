import { useRowVirtualizer } from "@/hooks/useRowVirtualizer";
import { trailReason } from "@/lib/format";
import type { SolverState, TrailEntry } from "@/model/trail";

const rowHeight = 20;

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

    const window = useRowVirtualizer(rows.length, rowHeight);

    if (rows.length === 0) {
        return (
            <p class="text-base-content/40 px-2 py-2 text-xs">
                Nothing assigned at this step.
            </p>
        );
    }

    const rendered = [];

    for (const item of window.items) {
        const row = rows[item.index];

        if (row.kind === "divider") {
            rendered.push(
                <div
                    key={row.key}
                    class="text-base-content/40 flex h-5 items-center gap-2 px-2 text-[11px]"
                >
                    <span class="font-mono">@{row.level}</span>
                    <span class="bg-base-300 h-px flex-1" />
                </div>,
            );
            continue;
        }

        const { entry } = row;

        rendered.push(
            <div
                key={row.key}
                class="hover:bg-base-300 flex h-5 items-center gap-2 px-2 font-mono text-xs whitespace-nowrap"
            >
                <span class="text-setiv-true w-12 shrink-0 text-right">
                    {entry.lit}
                </span>
                <span class="text-base-content/40 w-8 shrink-0">
                    @{entry.level}
                </span>
                <span
                    class={
                        entry.isDecision
                            ? "text-setiv-decision font-semibold"
                            : "text-base-content/50"
                    }
                >
                    {trailReason(entry)}
                </span>
            </div>,
        );
    }

    return (
        <div ref={window.ref} class="h-full overflow-x-auto overflow-y-auto">
            <div style={{ height: window.topPad }} />
            {rendered}
            <div style={{ height: window.bottomPad }} />
        </div>
    );
}
