import type { ComponentChildren } from "preact";
import { cn } from "../lib/cn";

interface PanelProps {
    title: ComponentChildren;
    actions?: ComponentChildren;
    fill?: boolean;
    children: ComponentChildren;
}

export function Panel({ title, actions, fill = false, children }: PanelProps) {
    return (
        <section
            class={cn(
                "card card-border border-base-300 bg-base-100 overflow-hidden",
                fill && "min-h-0 flex-1",
            )}
        >
            <div class="border-base-300 bg-base-200 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-1.5">
                <h2 class="text-sm font-semibold">{title}</h2>
                {actions}
            </div>
            <div
                class={cn(
                    "overflow-hidden",
                    fill && "flex min-h-0 flex-1 flex-col",
                )}
            >
                {children}
            </div>
        </section>
    );
}
