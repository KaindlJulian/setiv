import { useEffect } from "preact/hooks";
import type { RowAlignment, RowWindow } from "./useRowVirtualizer";

const settleDelay = 250;

/**
 * ugly workaround because virtualizer's scrollToIndex doesn't work when the container is hidden (height 0).
 */
function scrollWhenVisible(window: RowWindow, scroll: () => void) {
    const el = window.ref.current;

    if (!el) {
        return;
    }

    if (el.clientHeight > 0) {
        scroll();
        return;
    }

    let settle: ReturnType<typeof setTimeout> | undefined;

    const observer = new ResizeObserver(() => {
        if (el.clientHeight === 0) {
            return;
        }

        scroll();

        clearTimeout(settle);
        settle = setTimeout(() => observer.disconnect(), settleDelay);
    });

    observer.observe(el);

    return () => {
        clearTimeout(settle);
        observer.disconnect();
    };
}

/**
 * Scroll `row` into view. Re-runs whenever `row` or `request` changes, so a
 * caller that hands over a fresh `request` scrolls again even when the target
 * row is the one already selected.
 */
export function useRevealRow(
    window: RowWindow,
    row: number | null,
    request?: unknown,
    align: RowAlignment = "center",
) {
    useEffect(() => {
        if (row === null) {
            return;
        }

        return scrollWhenVisible(window, () =>
            window.scrollToIndex(row, align),
        );
    }, [row, align, request]);
}
