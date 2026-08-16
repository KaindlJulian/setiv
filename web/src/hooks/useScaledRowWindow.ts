import type { RefObject } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

// https://stackoverflow.com/questions/16637530/whats-the-maximum-pixel-value-of-css-width-and-height-properties
let elementHeightLimit = 33_554_400;

interface Block {
    start: number;
    end: number;
    offset: number;
    firstVisible: number;
}

export interface ScaledRowWindow extends Block {
    /** scroll container */
    ref: RefObject<HTMLDivElement>;
    /** height of the scroll surface, never more than the browser can lay out */
    surface: number;
    /** measured height of the scroll container, 0 until it has been observed */
    viewport: number;
    /** true while the surface is capped and the scrollbar is proportional */
    scaled: boolean;
    isRowVisible(row: number): boolean;
    scrollToRow(row: number): void;
}

// scaled because the event log can have a lot of rows, which exceeds the browser hieght limit for elements
export function useScaledRowWindow(
    count: number,
    rowHeight: number,
    overscan = 8,
): ScaledRowWindow {
    const ref = useRef<HTMLDivElement>(null);
    const [view, setView] = useState({ top: 0, height: 0 });

    useLayoutEffect(() => {
        const el = ref.current;

        if (!el) {
            return;
        }

        const sync = () =>
            setView((v) => {
                if (v.top === el.scrollTop && v.height === el.clientHeight) {
                    return v;
                }
                return { top: el.scrollTop, height: el.clientHeight };
            });

        sync();
        el.addEventListener("scroll", sync, { passive: true });

        const observer = new ResizeObserver(sync);
        observer.observe(el);

        return () => {
            el.removeEventListener("scroll", sync);
            observer.disconnect();
        };
    }, []);

    const total = count * rowHeight;
    const surface = Math.min(total, elementHeightLimit);
    const scaled = surface < total;

    /** rows that fit in the viewport as whole */
    const fits = (height: number) =>
        Math.max(1, Math.floor(height / rowHeight));
    /** rows needed to cover the viewport */
    const span = (height: number) =>
        Math.max(1, Math.ceil(height / rowHeight) + 1);
    /** topmost row once scrolled all the way down */
    const lastRow = (height: number) => Math.max(0, count - fits(height));
    /** the largest usable `scrollTop` */
    const lastTop = (height: number) => Math.max(0, surface - height);

    const resolve = (top: number, height: number): Block => {
        let first: number;
        let offset: number;

        if (scaled) {
            const bottom = lastTop(height);
            const ratio =
                bottom > 0 ? Math.min(1, Math.max(0, top / bottom)) : 0;
            first = Math.round(ratio * lastRow(height));
            offset = top;
        } else {
            first = Math.floor(top / rowHeight);
            offset = first * rowHeight;
        }

        first = Math.max(0, Math.min(first, Math.max(0, count - 1)));

        const back = Math.min(overscan, first, Math.floor(offset / rowHeight));
        const start = first - back;
        const end = Math.min(count, first + span(height) + overscan);
        const px = (end - start) * rowHeight;

        offset =
            end === count
                ? Math.max(0, surface - px)
                : Math.min(
                      offset - back * rowHeight,
                      Math.max(0, surface - px),
                  );

        return {
            start,
            end,
            offset,
            firstVisible:
                start + Math.max(0, Math.ceil((top - offset) / rowHeight)),
        };
    };

    const block = resolve(view.top, view.height);

    const isRowVisible = (row: number) => {
        if (view.height === 0) {
            return true;
        }
        if (
            row >= block.firstVisible &&
            row < block.firstVisible + fits(view.height)
        ) {
            return true;
        }
        return false;
    };

    const scrollToRow = (row: number) => {
        const el = ref.current;
        const height = view.height;

        if (!el || height === 0) {
            return;
        }

        const bottom = lastTop(height);
        const wanted = Math.max(
            0,
            Math.min(lastRow(height), row - Math.floor((fits(height) - 1) / 2)),
        );

        if (!scaled) {
            el.scrollTop = Math.min(bottom, wanted * rowHeight);
            return;
        }

        let lo = 0;
        let hi = bottom;

        for (let i = 0; i < 48 && hi - lo > 0.25; i++) {
            const mid = (lo + hi) / 2;

            if (resolve(mid, height).firstVisible < wanted) {
                lo = mid;
            } else {
                hi = mid;
            }
        }

        const shows = (top: number) => {
            const at = resolve(top, height).firstVisible;
            return row >= at && row < at + fits(height);
        };

        el.scrollTop = [hi, lo, bottom].find(shows) ?? hi;
    };

    return {
        ...block,
        ref,
        surface,
        viewport: view.height,
        scaled,
        isRowVisible,
        scrollToRow,
    };
}
