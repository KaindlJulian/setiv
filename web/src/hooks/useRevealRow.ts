import { useEffect } from "preact/hooks";
import type { RowAlignment, RowWindow } from "./useRowVirtualizer";

const settleDelay = 250;

/**
 * ugly workaround because virtualizer's scrollToIndex doesn't work when the container is hidden (height 0).
 */
export function useRevealRow(
    window: RowWindow,
    row: number | null,
    align: RowAlignment = "center",
) {
    useEffect(() => {
        const el = window.ref.current;

        if (row === null || !el) {
            return;
        }

        if (el.clientHeight > 0) {
            window.scrollToIndex(row, align);
            return;
        }

        let settle: ReturnType<typeof setTimeout> | undefined;

        const observer = new ResizeObserver(() => {
            if (el.clientHeight === 0) {
                return;
            }

            window.scrollToIndex(row, align);

            clearTimeout(settle);
            settle = setTimeout(() => observer.disconnect(), settleDelay);
        });

        observer.observe(el);

        return () => {
            clearTimeout(settle);
            observer.disconnect();
        };
    }, [row, align]);
}
