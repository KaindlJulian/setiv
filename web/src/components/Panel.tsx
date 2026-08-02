import type { ComponentChildren } from "preact";

interface PanelProps {
    title: ComponentChildren;
    actions?: ComponentChildren;
    children: ComponentChildren;
}

export function Panel({ title, actions, children }: PanelProps) {
    return (
        <section class="rounded border border-gray-300">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-gray-300 bg-gray-100 px-3 py-1.5">
                <h2 class="text-sm font-semibold">{title}</h2>
                {actions}
            </div>
            <div class="overflow-hidden">{children}</div>
        </section>
    );
}
