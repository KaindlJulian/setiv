import { FileInput } from "@/components/FileInput";
import { RunStatus } from "@/components/RunStatus";
import { useDismiss } from "@/hooks/useDismiss";
import { cn } from "@/lib/cn";
import { useSource } from "@/state/context";
import { FolderOpen } from "lucide-preact";
import { useLocation } from "preact-iso";
import { useRef, useState } from "preact/hooks";
import { ThemeToggle } from "./ThemeToggle";

declare const __GIT_SUBJECT__: string;
declare const __GIT_DATE__: string;

const pages = [
    { href: "/", label: "Main" },
    { href: "/chart", label: "Chart" },
    { href: "/help", label: "Help" },
] as const;

export function Navbar() {
    const source = useSource();

    return (
        <header class="navbar border-base-300 bg-base-100 min-h-0 shrink-0 gap-2 border-b px-3 py-1.5">
            <div class="flex min-w-0 flex-1 items-center gap-2">
                <h1 class="z-10 shrink-0 text-lg font-semibold">
                    SETIV
                    <span class="text-base-content/50 hidden truncate text-center text-xs lg:inline">
                        (<span class="font-mono">master </span>
                        {__GIT_SUBJECT__} - {__GIT_DATE__})
                    </span>
                </h1>

                {source.run.value && <PageNav />}

                <span class="text-base-content/50 absolute hidden w-full truncate text-center text-xs lg:inline">
                    <span>{source.fileName}</span>
                </span>
            </div>

            <div class="z-10 flex shrink-0 items-center gap-1">
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
        <nav class="z-10 flex shrink-0 items-center gap-1">
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
                Open
            </summary>
            <div class="dropdown-content rounded-box border-base-300 bg-base-100 z-20 mt-1 w-96 border p-4 shadow-lg">
                <FileInput onSettled={() => setOpen(false)} />
            </div>
        </details>
    );
}
