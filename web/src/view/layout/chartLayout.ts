export interface LevelColumn {
    i: number;
    min: number;
    max: number;
}

export interface LevelSeries {
    columns: LevelColumn[];
    /** true when every visible event got its own column */
    exact: boolean;
}

/**
 * Reduce `level` over the visible event range `[from, to]` to about `columns`
 * buckets, keeping each bucket's extremes.
 */
export function decimateLevels(
    level: Int32Array,
    from: number,
    to: number,
    columns: number,
): LevelSeries {
    const lo = Math.max(0, Math.min(from, level.length - 1));
    const hi = Math.max(lo, Math.min(to, level.length - 1));
    const span = hi - lo + 1;
    const buckets = Math.max(1, Math.floor(columns));

    if (level.length === 0) {
        return { columns: [], exact: true };
    }

    if (span <= buckets) {
        const out: LevelColumn[] = new Array(span);

        for (let k = 0; k < span; k++) {
            const value = level[lo + k];
            out[k] = { i: lo + k, min: value, max: value };
        }

        return { columns: out, exact: true };
    }

    const out: LevelColumn[] = new Array(buckets);
    const width = span / buckets;

    for (let b = 0; b < buckets; b++) {
        const start = lo + Math.floor(b * width);
        const end =
            b === buckets - 1 ? hi : lo + Math.floor((b + 1) * width) - 1;

        let min = level[start];
        let max = min;

        for (let i = start + 1; i <= end; i++) {
            const value = level[i];

            if (value < min) {
                min = value;
            } else if (value > max) {
                max = value;
            }
        }

        out[b] = { i: start, min, max };
    }

    return { columns: out, exact: false };
}
