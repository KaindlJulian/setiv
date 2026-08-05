import { FolderOpen } from "lucide-preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { EmptyState } from "./components/EmptyState";
import { FileInput } from "./components/FileInput";
import { LoadDiagnostics } from "./components/LoadDiagnostics";
import { Sidebar } from "./components/Sidebar";
import { StepBar } from "./components/StepBar";
import { ThemeToggle } from "./components/ThemeToggle";
import { Workspace } from "./components/Workspace";
import { useSolverStore } from "./state/context";

declare const __GIT_COMMIT__: string;
declare const __GIT_SUBJECT__: string;
declare const __GIT_DATE__: string;

export function App() {
    const store = useSolverStore();

    const run = store.run.value;

    return (
        <div class="bg-base-200 text-base-content flex h-screen flex-col overflow-hidden font-sans">
            <Navbar />

            <StepBar />

            <div class="flex min-h-0 flex-1">
                {run && (
                    <aside class="border-base-300 bg-base-200 flex w-80 shrink-0 flex-col border-r">
                        <div class="min-h-0 flex-1 overflow-y-auto">
                            <Sidebar />
                        </div>
                    </aside>
                )}

                <main class="flex min-h-0 min-w-0 flex-1 flex-col">
                    <LoadDiagnostics />
                    {run ? <Workspace /> : <EmptyState />}
                </main>
            </div>
        </div>
    );
}

function Navbar() {
    return (
        <header class="navbar border-base-300 bg-base-100 min-h-0 shrink-0 gap-2 border-b px-3 py-1.5">
            <div class="flex min-w-0 flex-1 items-center gap-2">
                <h1 class="shrink-0 text-base font-semibold">
                    SAT Visualizer (master)
                </h1>

                <span class="text-base-content/50 hidden min-w-0 truncate text-xs lg:inline">
                    <span class="font-mono">{__GIT_COMMIT__} - </span>
                    {__GIT_SUBJECT__} - {__GIT_DATE__}
                </span>
            </div>

            <div class="flex shrink-0 items-center gap-1">
                <LogMenu />
                <ThemeToggle />
            </div>
        </header>
    );
}

function LogMenu() {
    const ref = useRef<HTMLDetailsElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        window.addEventListener("pointerdown", onPointerDown);
        return () => window.removeEventListener("pointerdown", onPointerDown);
    }, [open]);

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
