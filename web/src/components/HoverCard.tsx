import { cn } from "@/lib/cn";
import type { ComponentChildren } from "preact";

const cardWidth = 256;
const flipBelow = 60;

interface Props {
    x: number;
    y: number;
    containerWidth: number;
    children: ComponentChildren;
}

export function HoverCard({ x, y, containerWidth, children }: Props) {
    const flipX = x > containerWidth - cardWidth;
    const flipY = y > flipBelow;

    return (
        <div
            class={cn(
                "border-base-300 bg-base-100 pointer-events-none absolute z-10 max-w-64 rounded border px-2 py-1 text-xs shadow-md",
                flipY && "-translate-y-full",
                flipX && "-translate-x-full",
            )}
            style={{
                left: `${x + (flipX ? -10 : 10)}px`,
                top: `${y + (flipY ? -8 : 8)}px`,
            }}
        >
            {children}
        </div>
    );
}
