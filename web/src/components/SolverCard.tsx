import { type SolverInfo } from "@/model/solvers";
import { useSource } from "@/state/context";
import { Play, RotateCcw } from "lucide-preact";
import { useLocation } from "preact-iso";
import { useState } from "preact/hooks";

interface SolverCardProps {
    solver: SolverInfo;
    file: File | null;
    onRun?: () => void;
}

export function SolverCard({ solver, file, onRun }: SolverCardProps) {
    const source = useSource();
    const location = useLocation();

    const defaults = solver.wasm.defaultFlags.join(" ");
    const [flagText, setFlagText] = useState(defaults);

    const flags = flagText.split(/\s+/).filter((word) => word.length > 0);
    const busy = source.status.value !== "idle";

    const run = async () => {
        if (!file || busy) {
            return;
        }

        onRun?.();
        location.route("/chart");
        await source.loadFormula(file, solver.id, flags);
        location.route("/");
    };

    return (
        <div class="border-base-300 bg-base-100 rounded-box flex flex-col gap-3 border p-3 text-xs">
            <div class="flex items-baseline justify-between gap-2">
                <span class="text-sm font-medium">{solver.name}</span>
                <span class="text-base-content/50 font-mono">
                    {solver.version}
                </span>
            </div>

            <label class="flex flex-col gap-1.5">
                <textarea
                    value={flagText}
                    onInput={(e) => setFlagText(e.currentTarget.value)}
                    spellcheck={false}
                    disabled={busy}
                    class="textarea textarea-sm w-full resize-y font-mono text-xs"
                />
                <span class="flex items-center justify-end gap-2">
                    {flagText !== defaults && (
                        <button
                            type="button"
                            onClick={() => setFlagText(defaults)}
                            disabled={flagText.trim() === defaults}
                            title="Restore the preset's flags"
                            class="btn btn-ghost btn-xs gap-1 font-normal"
                        >
                            <RotateCcw size={12} />
                            Reset
                        </button>
                    )}
                </span>
            </label>

            <pre class="border-base-300 bg-base-200 text-base-content/80 flex gap-2 rounded border p-2 font-mono wrap-break-word whitespace-pre-wrap">
                <span class="text-base-content/40 select-none">$</span>
                <code>
                    {solver.wasm
                        .argv(flags, {
                            cnf: "[formula]",
                            log: "events.jsonl",
                        })
                        .join(" ")}
                </code>
            </pre>

            <div class="flex items-center justify-between gap-2">
                <span class="text-base-content/60 min-w-0 truncate font-mono">
                    {file ? file.name : "Choose a CNF formula to run"}
                </span>
                <button
                    type="button"
                    onClick={() => void run()}
                    disabled={!file || busy}
                    class="btn btn-primary btn-sm shrink-0 gap-1"
                >
                    <Play size={14} />
                    Run
                </button>
            </div>
        </div>
    );
}
