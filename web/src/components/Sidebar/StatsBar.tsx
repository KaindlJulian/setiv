import { cn } from "@/lib/cn";
import { useSource } from "@/state/context";
import { selectedSolver } from "@/state/solverSelection";
import { colors } from "@/view/theme";
import { Download } from "lucide-preact";

export function StatsBar() {
    const source = useSource();
    const run = source.run.value;

    if (!run) {
        return null;
    }

    const { stats, result } = run;

    const rows: [string, number][] = [
        ["events", stats.events],
        ["vars", stats.variables],
        ["clauses", stats.clauses],
        ["decisions", stats.decisions],
        ["conflicts", stats.conflicts],
        ["backtracks", stats.backtracks],
        ["restarts", stats.restarts],
    ];

    return (
        <div class="border-base-300 bg-base-100 flex shrink-0 flex-col gap-2 border-b px-2.5 py-2">
            <div class="flex items-center gap-1.5">
                <span
                    class="min-w-0 flex-1 truncate font-mono text-xs"
                    title={source.fileName.value}
                >
                    {source.fileName.value}
                </span>
                <DownloadLog />
                {result && (
                    <span
                        class={cn(
                            "badge badge-sm shrink-0",
                            colors[result.result],
                        )}
                    >
                        {result.result.toUpperCase()}
                    </span>
                )}
            </div>

            <dl class="grid grid-cols-2 gap-x-4 text-xs">
                {rows.map(([label, value]) => (
                    <div key={label} class="flex justify-between gap-2">
                        <dt class="text-base-content/50 truncate">{label}</dt>
                        <dd class="font-mono tabular-nums">{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

/**
 * Download a log generated in the browser.
 */
function DownloadLog() {
    const solver = selectedSolver.value;
    const source = useSource();
    const log = source.generatedLog.value;
    const name = source.fileName.value.replace(/\.(cnf|dimacs)$/i, "");

    if (!log) {
        return null;
    }

    const save = () => {
        const url = URL.createObjectURL(log);
        const a = document.createElement("a");

        a.href = url;
        a.download = `${name}_${solver.id}_events.jsonl`;
        a.click();

        URL.revokeObjectURL(url);
    };

    return (
        <button
            type="button"
            onClick={save}
            class="btn btn-ghost btn-xs shrink-0 px-1"
            title={`Download ${name}_${solver.id}_events.jsonl`}
        >
            <Download size={13} />
        </button>
    );
}
