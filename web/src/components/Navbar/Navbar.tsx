import { FolderOpen } from "lucide-preact";
import { useLocation } from "preact-iso";
import { useRef, useState } from "preact/hooks";
import { useDismiss } from "@/hooks/useDismiss";
import { cn } from "@/lib/cn";
import { FileInput } from "@/components/FileInput";
import { RunStatus } from "@/components/RunStatus";
import { ThemeToggle } from "./ThemeToggle";

declare const __GIT_COMMIT__: string;
declare const __GIT_SUBJECT__: string;
declare const __GIT_DATE__: string;

const pages = [
    { href: "/", label: "Main" },
    { href: "/chart", label: "Chart" },
    { href: "/help", label: "Help" },
] as const;

export function Navbar() {
    return (
        <header class="navbar border-base-300 bg-base-100 min-h-0 shrink-0 gap-2 border-b px-3 py-1.5">
            <div class="flex min-w-0 flex-1 items-center gap-2">
                <h1 class="shrink-0 text-base font-semibold">
                    SAT Visualizer (master)
                </h1>

                <PageNav />

                <span class="text-base-content/50 hidden w-full truncate text-center text-xs lg:inline">
                    <span class="font-mono">{__GIT_COMMIT__} - </span>
                    {__GIT_SUBJECT__} - {__GIT_DATE__}
                </span>
            </div>

            <div class="flex shrink-0 items-center gap-1">
                <RunStatus />
                <LogMenu />
                <ThemeToggle />
            </div>
        </header>
    );
}

function PageNav() {
    const { path } = useLocation();

    return (
        <nav class="flex shrink-0 items-center gap-1">
            {pages.map(({ href, label }) => (
                <a
                    key={href}
                    href={href}
                    aria-current={path === href ? "page" : undefined}
                    class={cn("btn btn-xs", path === href && "btn-active")}
                >
                    {label}
                </a>
            ))}
        </nav>
    );
}

function LogMenu() {
    const ref = useRef<HTMLDetailsElement>(null);
    const [open, setOpen] = useState(false);

    useDismiss(ref, open, () => setOpen(false));

    return (
        <details ref={ref} open={open} class="dropdown dropdown-end">
            <summary
                onClick={(e) => {
                    e.preventDefault();
                    setOpen(!open);
                }}
                class="btn btn-ghost btn-sm gap-2"
            >
                <FolderOpen size={15} />
                Open log
            </summary>
            <div class="dropdown-content rounded-box border-base-300 bg-base-100 z-20 mt-1 w-80 border p-4 shadow-lg">
                <FileInput onSettled={() => setOpen(false)} />
            </div>
        </details>
    );
}
