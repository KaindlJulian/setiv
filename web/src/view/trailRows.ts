import type { TrailEntry } from "@/model/trail";

export type TrailRow =
    | { kind: "divider"; level: number; key: string }
    | { kind: "entry"; entry: TrailEntry; key: string };

export interface TrailRows {
    rows: TrailRow[];
    /** Event index to row index */
    rowOf: Map<number, number>;
}

export function buildTrailRows(trail: readonly TrailEntry[]): TrailRows {
    const rows: TrailRow[] = [];
    const rowOf = new Map<number, number>();

    let previous: number | null = null;

    for (const entry of trail) {
        if (entry.level !== previous) {
            rows.push({
                kind: "divider",
                level: entry.level,
                key: `d${entry.eventIndex}`,
            });
            previous = entry.level;
        }

        rowOf.set(entry.eventIndex, rows.length);
        rows.push({ kind: "entry", entry, key: `e${entry.eventIndex}` });
    }

    return { rows, rowOf };
}
