import { ChevronRight } from "lucide-preact";
import type { ComponentChildren } from "preact";
import { cn } from "../lib/cn";

interface CollapsibleSectionProps {
    title: string;
    badge?: ComponentChildren;
    open: boolean;
    onToggle: () => void;
    children: ComponentChildren;
}

export function CollapsibleSection({
    title,
    badge,
    open,
    onToggle,
    children,
}: CollapsibleSectionProps) {
    return (
        <section
            class={cn(
                "border-base-300 collapse rounded-none border-b",
                open
                    ? "collapse-open min-h-0 flex-1"
                    : "collapse-close shrink-0",
            )}
        >
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                class="collapse-title text-base-content/80 hover:bg-base-300 flex cursor-pointer items-center gap-1.5 py-1.5 ps-1.5 pe-2 text-left text-xs font-semibold tracking-wide uppercase"
            >
                <ChevronRight
                    size={13}
                    class={cn(
                        "shrink-0 transition-transform duration-200",
                        open && "rotate-90",
                    )}
                />
                <span class="flex-1 truncate">{title}</span>
                {badge != null && (
                    <span class="badge badge-ghost badge-xs font-mono font-normal">
                        {badge}
                    </span>
                )}
            </button>

            <div class="collapse-content h-full min-h-0 px-0 pb-0">
                {children}
            </div>
        </section>
    );
}
