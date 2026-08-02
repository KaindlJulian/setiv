import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

interface CollapsibleSectionProps {
    title: string;
    badge?: ComponentChildren;
    defaultOpen?: boolean;
    children: ComponentChildren;
}

export function CollapsibleSection({
    title,
    badge,
    defaultOpen = false,
    children,
}: CollapsibleSectionProps) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <section class="border-b border-gray-200">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                class="sticky top-0 z-10 flex w-full cursor-pointer items-center gap-1 bg-gray-100 px-2 py-1 text-left text-xs font-semibold tracking-wide text-gray-700 uppercase hover:bg-gray-200"
            >
                <span class="flex-1 truncate">{title}</span>
                {badge != null && (
                    <span class="font-mono text-[11px] font-normal text-gray-500">
                        {badge}
                    </span>
                )}
            </button>

            {open && <div>{children}</div>}
        </section>
    );
}
