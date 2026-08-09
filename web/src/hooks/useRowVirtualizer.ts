import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import type { RefObject } from "preact";
import { useRef } from "preact/hooks";

export type RowAlignment = "start" | "center" | "end" | "auto";

export interface RowWindow {
    ref: RefObject<HTMLDivElement>;
    items: VirtualItem[];
    topPad: number;
    bottomPad: number;
    scrollToIndex: (index: number, align?: RowAlignment) => void;
}

export function useRowVirtualizer(
    count: number,
    rowHeight: number,
    overscan = 8,
): RowWindow {
    const ref = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count,
        getScrollElement: () => ref.current,
        estimateSize: () => rowHeight,
        overscan,
    });

    const items = virtualizer.getVirtualItems();

    return {
        ref,
        items,
        topPad: items[0]?.start ?? 0,
        bottomPad:
            virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0),
        scrollToIndex: (index, align = "auto") =>
            virtualizer.scrollToIndex(index, { align }),
    };
}
