import { useVirtualList } from "../hooks/useVirtualList";
import type { ClauseRecord } from "../model/clauseDatabase";
import { litValue, type SolverState } from "../model/trail";
import { colors } from "../view/theme";

const rowHeight = 20;
const viewportHeight = 260;

interface ClauseListProps {
    records: ClauseRecord[];
    state: SolverState;
    empty: string;
}

export function ClauseList({ records, state, empty }: ClauseListProps) {
    const window = useVirtualList(records.length, rowHeight, viewportHeight);

    if (records.length === 0) {
        return <p class="text-base-content/40 px-2 py-2 text-xs">{empty}</p>;
    }

    const rows = [];

    for (let i = window.start; i < window.end; i++) {
        const record = records[i];

        rows.push(
            <div
                key={record.key}
                class="hover:bg-base-300 flex h-5 items-center gap-2 px-2 font-mono text-xs whitespace-nowrap"
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
        <div
            onScroll={window.onScroll}
            style={{
                height: Math.min(viewportHeight, records.length * rowHeight),
            }}
            class="overflow-x-auto overflow-y-auto"
        >
            <div style={{ height: window.topPad }} />
            {rows}
            <div style={{ height: window.bottomPad }} />
        </div>
    );
}
