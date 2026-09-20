import type { VarNames } from "@/lib/compile";
import { type SolverInfo } from "@/model/solvers";
import { useSource } from "@/state/context";
import { Play } from "lucide-preact";
import { useLocation } from "preact-iso";
import { useState } from "preact/hooks";

interface SolverCardProps {
    solver: SolverInfo;
    file: File | null;
    names?: VarNames | null;
    onRun?: () => void;
}

export function SolverCard({ solver, file, names, onRun }: SolverCardProps) {
    const source = useSource();
    const location = useLocation();

    const defaults = solver.wasm.defaultFlags.join(" ");
    const [flagText, setFlagText] = useState(defaults);
    const [bcp, setBcp] = useState(false);

    const flags = flagText.split(/\s+/).filter((word) => word.length > 0);
    const busy = source.status.value !== "idle";

    const shape = solver.wasm.argv(["!MARK!"], {
        cnf: file ? file.name : "[formula.cnf]",
        log: "events.jsonl",
    });
    const seam = shape.indexOf("!MARK!");
    const head = seam < 0 ? shape : shape.slice(0, seam);
    const tail = seam < 0 ? [] : shape.slice(seam + 1);

    const run = async () => {
        if (!file || busy) {
            return;
        }

        onRun?.();
        location.route("/chart");
        await source.loadFormula(file, solver.id, flags, names ?? null);
    };

    return (
        <div class="border-base-300 bg-base-100 rounded-box flex flex-col gap-3 border p-3 text-xs">
            <div class="flex items-baseline justify-between gap-2">
                <a
                    class="cursor-pointer text-sm font-medium hover:underline"
                    href={solver.link}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Solver: {solver.name}
                </a>
                <span class="text-base-content/50 font-mono">
                    {solver.version}
                </span>
            </div>

            {/* feels like info overload
            <div class="flex flex-wrap gap-1">
                {solver.tags.map((tag) => (
                    <span
                        key={tag}
                        class="badge badge-ghost badge-sm font-mono"
                    >
                        {tag}
                    </span>
                ))}
            </div> 
            */}

            <div class="flex flex-col gap-1.5">
                <div
                    class="tooltip tooltip-right flex items-baseline gap-2 font-medium"
                    data-tip="Additional command-line flags. See the solver's documentation for details."
                >
                    Additional Flags:
                    <input
                        id="solver-flags"
                        value={flagText}
                        onInput={(e) => setFlagText(e.currentTarget.value)}
                        spellcheck={false}
                        disabled={busy}
                        class="input input-xs flex-1 font-mono text-xs"
                    />
                </div>
            </div>

            <div class="flex items-start gap-2">
                <div
                    class="tooltip tooltip-right flex gap-2 font-medium"
                    data-tip="Adds additional events for each clause inspection during propagation. Significantly increaseslog size!"
                >
                    <span class="flex flex-col gap-0.5">
                        BCP-level logging:
                    </span>
                    <input
                        type="checkbox"
                        checked={bcp}
                        onChange={(e) => {
                            setBcp(e.currentTarget.checked);
                            setFlagText((prev) =>
                                bcp
                                    ? prev
                                          .replace(solver.wasm.bcpFlag, "")
                                          .trim()
                                    : prev + " " + solver.wasm.bcpFlag,
                            );
                        }}
                        disabled={busy}
                        class="toggle toggle-xs mt-0.5 cursor-pointer"
                    />
                </div>
            </div>

            <pre class="border-base-300 bg-base-200 text-base-content/80 flex gap-2 rounded border p-2 font-mono wrap-break-word whitespace-pre-wrap">
                <span class="text-base-content/40 select-none">$</span>
                <code>
                    <span class="text-base-content/40">{head.join(" ")} </span>
                    <span>{flags.length > 0 && flags.join(" ")}</span>

                    <span class="text-base-content/40"> {tail.join(" ")}</span>
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
