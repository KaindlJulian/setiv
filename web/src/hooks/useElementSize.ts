import { useCallback, useEffect, useRef, useState } from "preact/hooks";

export interface Size {
    width: number;
    height: number;
}

/**
 * Observe an element's content box size for responsive viewboxes
 */
export function useElementSize<T extends HTMLElement>(): [
    (el: T | null) => void,
    Size,
    T | null,
] {
    const [size, setSize] = useState<Size>({ width: 0, height: 0 });
    const [element, setElement] = useState<T | null>(null);
    const observer = useRef<ResizeObserver | null>(null);

    useEffect(() => () => observer.current?.disconnect(), []);

    const ref = useCallback((el: T | null) => {
        observer.current?.disconnect();
        observer.current = null;
        setElement(el);

        if (!el) {
            setSize((prev) =>
                prev.width === 0 && prev.height === 0
                    ? prev
                    : { width: 0, height: 0 },
            );
            return;
        }

        const next = new ResizeObserver((entries) => {
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

        next.observe(el);
        observer.current = next;
    }, []);

    return [ref, size, element];
}
