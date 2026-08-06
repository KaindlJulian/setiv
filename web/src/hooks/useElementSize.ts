import { useEffect, useRef, useState } from "preact/hooks";
import type { RefObject } from "preact";

export interface Size {
    width: number;
    height: number;
}

/**
 * Observe an element's content box.
 *
 * The graph and tree charts get by on `viewBox` scaling alone, because a
 * stretched node label is harmless. Axis ticks are not: they need real pixels
 * to pick a tick count and to stay undistorted.
 */
export function useElementSize<T extends HTMLElement>(): [
    RefObject<T>,
    Size,
] {
    const ref = useRef<T>(null);
    const [size, setSize] = useState<Size>({ width: 0, height: 0 });

    useEffect(() => {
        const el = ref.current;

        if (!el) {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            const box = entries[0]?.contentRect;

            if (!box) {
                return;
            }

            setSize((prev) =>
                prev.width === box.width && prev.height === box.height
                    ? prev
                    : { width: box.width, height: box.height },
            );
        });

        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    return [ref, size];
}
