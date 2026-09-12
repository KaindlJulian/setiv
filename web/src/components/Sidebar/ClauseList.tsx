import { useRevealRow } from "@/hooks/useRevealRow";
import { useRowVirtualizer } from "@/hooks/useRowVirtualizer";
import { useView } from "@/state/context";
import { cn } from "@/lib/cn";
import type { ClauseRecord } from "@/model/clauseDatabase";
import { litValue, type SolverState } from "@/model/trail";
import { colors } from "@/view/theme";
import { useMemo } from "preact/hooks";

const rowHeight = 20;

interface ClauseListProps {
    records: ClauseRecord[];
    state: SolverState;
    empty: string;
    selectedId: number | null;
}

export function ClauseList({
    records,
    state,
    empty,
    selectedId,
}: ClauseListProps) {
    const view = useView();

    const window = useRowVirtualizer(records.length, rowHeight, {
        follow: true,
    });

    const revealed = useMemo(() => {
        if (selectedId == null) {
            return null;
        }

        const row = records.findIndex((r) => r.id === selectedId);
        return row >= 0 ? row : null;
    }, [records, selectedId]);

    useRevealRow(window, revealed, view.clauseScroll.value);

    if (records.length === 0) {
        return <p class="text-base-content/40 px-2 py-2 text-xs">{empty}</p>;
    }

    const rows = [];

    for (const item of window.items) {
        const record = records[item.index];

        rows.push(
            <div
                key={record.key}
                class={cn(
                    "flex h-5 items-center gap-2 border-l-2 px-2 font-mono text-xs whitespace-nowrap",
                    record.id === selectedId
                        ? "border-primary bg-primary/20"
                        : "hover:bg-base-300 border-transparent",
                )}
            >
                <span class="text-base-content/40 w-14 shrink-0 truncate">
                    {record.key}
                </span>
                {record.literals.map((lit, k) => (
                    <span
                        key={k}
                        class={
                            colors[
                                String(litValue(lit, state)) as "1" | "-1" | "0"
                            ]
                        }
                    >
                        {lit}
                    </span>
                ))}
            </div>,
        );
    }

    return (
        <div ref={window.ref} class="h-full overflow-x-auto overflow-y-auto">
            <div style={{ height: window.topPad }} />
            {rows}
            <div style={{ height: window.bottomPad }} />
        </div>
    );
}
