import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

/**
 * Call `onDismiss` while `active`, on click outside `ref` or
 * Escape is pressed.
 */
export function useDismiss(
    ref: RefObject<Node>,
    active: boolean,
    onDismiss: () => void,
) {
    const dismiss = useRef(onDismiss);
    dismiss.current = onDismiss;

    useEffect(() => {
        if (!active) {
            return;
        }

        const onPointerDown = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) {
                dismiss.current();
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                dismiss.current();
            }
        };

        document.addEventListener("pointerdown", onPointerDown, true);
        document.addEventListener("keydown", onKeyDown, true);

        return () => {
            document.removeEventListener("pointerdown", onPointerDown, true);
            document.removeEventListener("keydown", onKeyDown, true);
        };
    }, [active]);
}
