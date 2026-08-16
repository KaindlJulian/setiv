import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";

/**
 * Call `onDismiss` when a pointer goes down outside `ref`, while `active`.
 */
export function useDismissOnOutside(
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

        document.addEventListener("pointerdown", onPointerDown, true);
        return () =>
            document.removeEventListener("pointerdown", onPointerDown, true);
    }, [active]);
}
