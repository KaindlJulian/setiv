import type { RefObject } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

export interface Size {
    width: number;
    height: number;
}

/**
 * Observe an element's content box size for responsive viewboxes
 */
export function useElementSize<T extends HTMLElement>(): [RefObject<T>, Size] {
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
