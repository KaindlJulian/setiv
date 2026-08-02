import { useState } from "preact/hooks";

export interface VirtualWindow {
    start: number;
    end: number;
    topPad: number;
    bottomPad: number;
    onScroll: (e: Event) => void;
}

/**
 * Fixed-height row windowing for the sidebar lists.
 */
export function useVirtualList(
    count: number,
    rowHeight: number,
    viewportHeight: number,
    overscan = 8,
): VirtualWindow {
    const [scrollTop, setScrollTop] = useState(0);

    const visible = Math.ceil(viewportHeight / rowHeight);
    const first = Math.floor(scrollTop / rowHeight);

    const end = Math.min(count, first + visible + overscan);
    const start = Math.min(Math.max(0, first - overscan), end);

    return {
        start,
        end,
        topPad: start * rowHeight,
        bottomPad: Math.max(0, (count - end) * rowHeight),
        onScroll: (e: Event) => {
            setScrollTop((e.currentTarget as HTMLElement).scrollTop);
        },
    };
}
