import { cn } from "@/lib/cn";
import { compileFormula } from "@/lib/compile";
import { solvers } from "@/model/solvers";
import { useSource } from "@/state/context";
import { selectedSolver, selectedSolverId } from "@/state/solverSelection";

import { ChevronDown, ChevronRight, CircleAlert, Play } from "lucide-preact";
import { useEffect, useId, useMemo, useRef, useState } from "preact/hooks";

import { FormulaEditor } from "./FormulaEditor";
import { SampleList } from "./SampleList";
import { type Sample } from "./samples";
import { SolverOptions, useSolverFlags } from "./SolverOptions";

type TabId = "formula" | "dimacs" | "log";

interface Uploaded {
    file: File;
    text: string;
    note: string | null;
}

export function FileInput({ onSettled }: { onSettled?: () => void }) {
    const source = useSource();
    const ids = useId();

    const busy = source.status.value !== "idle";
    const solver = selectedSolver.value;
    const flagState = useSolverFlags(solver);

    const [tab, setTab] = useState<TabId>("formula");
    const [text, setText] = useState("");
    const [uploaded, setUploaded] = useState<Uploaded | null>(null);
    const [showDimacs, setShowDimacs] = useState(false);

    const dimacsInput = useRef<HTMLInputElement>(null);
    const pick = useRef(0);

    const compiled = useMemo(
        () => (text.trim() ? compileFormula(text) : null),
        [text],
    );

    const compiledFile = useMemo(
        () =>
            compiled?.ok
                ? new File([compiled.dimacs], "formula.cnf", {
                      type: "text/plain",
                  })
                : null,
        [compiled],
    );

    const formulaFile =
        tab === "formula" ? compiledFile : uploaded?.file || null;

    const dimacs =
        tab === "formula"
            ? compiled?.ok
                ? compiled.dimacs
                : null
            : uploaded?.text || null;

    const loadError = source.loadError.value;

    const takeFormula = async (file: File, note?: string) => {
        const id = ++pick.current;
        const body = await file.text();

        if (pick.current !== id) {
            return;
        }

        setUploaded({ file, text: body, note: note ?? null });
        setTab("dimacs");
    };

    // Update file input when sample selected
    useEffect(() => {
        if (!dimacsInput.current || !uploaded) {
            return;
        }
        const picked = new DataTransfer();
        picked.items.add(uploaded.file);
        dimacsInput.current.files = picked.files;
    }, [uploaded, tab]);

    const loadSample = async (sample: Sample) => {
        const url = `${import.meta.env.BASE_URL}samples/${sample.file}`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                source.setLoadError(
                    `Could not load sample ${sample.file} (HTTP ${res.status}).`,
                    sample.file,
                );
                return;
            }
            await takeFormula(
                new File([await res.blob()], sample.file),
                sample.note,
            );
        } catch (err) {
            source.setLoadError(
                `Could not load sample ${sample.file}: ${err}`,
                sample.file,
            );
        }
    };

    const takeLog = async (file: File | undefined) => {
        if (!file) {
            return;
        }
        await source.loadLogFile(file);
        onSettled?.();
    };

    const canRun = formulaFile !== null && !busy;

    const blocked = () => {
        if (canRun || busy) {
            return null;
        }
        if (tab === "dimacs") {
            return "Choose a file to run";
        }
        if (compiled && !compiled.ok) {
            return "Invalid formula";
        }
        return "Input a formula to run";
    };

    const run = async () => {
        if (!formulaFile || !canRun) {
            return;
        }

        onSettled?.();
        await source.loadFormula(
            formulaFile,
            solver.id,
            flagState.flags,
            compiled?.ok ? compiled.names : null,
        );
    };

    return (
        <div class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-2">
                <div
                    role="tablist"
                    aria-label="Input"
                    class="tabs tabs-box tabs-xs"
                >
                    <Tab id="formula" tab={tab} set={setTab}>
                        Formula
                    </Tab>
                    <Tab id="dimacs" tab={tab} set={setTab}>
                        DIMACS file
                    </Tab>
                    <Tab id="log" tab={tab} set={setTab}>
                        Event log
                    </Tab>
                </div>

                <div class="flex shrink-0 items-center gap-2">
                    <label for={`${ids}-solver`} class="text-sm font-medium">
                        Solver
                    </label>
                    <select
                        id={`${ids}-solver`}
                        value={solver.id}
                        onChange={(e) => {
                            selectedSolverId.value = e.currentTarget.value;
                        }}
                        disabled={busy || tab === "log"}
                        class="select select-sm w-36"
                    >
                        {solvers.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loadError && (
                <div
                    role="alert"
                    class="alert alert-error alert-soft items-start py-1.5"
                >
                    <CircleAlert size={15} class="mt-0.5 shrink-0" />
                    <p class="min-w-0 text-xs">{loadError.message}</p>
                </div>
            )}

            {tab === "log" ? (
                <div class="flex flex-col gap-1.5">
                    <input
                        type="file"
                        accept=".jsonl,.ndjson"
                        aria-label="Solver event log"
                        onChange={(e) => {
                            const input = e.currentTarget;
                            void takeLog(input.files?.[0]);
                            input.value = "";
                        }}
                        disabled={busy}
                        class="file-input file-input-sm w-full"
                    />
                    <p class="text-base-content/60 ml-2 text-xs">
                        You can export the log from a previous run and load it
                        here.
                    </p>
                </div>
            ) : (
                <>
                    {tab === "formula" ? (
                        <FormulaEditor
                            text={text}
                            setText={setText}
                            compiled={compiled}
                            showError={true}
                            busy={busy}
                        />
                    ) : (
                        <input
                            ref={dimacsInput}
                            type="file"
                            accept=".dimacs,.cnf,.*"
                            aria-label="CNF formula in DIMACS format"
                            onChange={(e) => {
                                if (e.currentTarget.files?.[0]) {
                                    void takeFormula(e.currentTarget.files[0]);
                                }
                            }}
                            disabled={busy}
                            class="file-input file-input-sm w-full"
                        />
                    )}

                    {dimacs && (
                        <div class="flex flex-col gap-1.5">
                            <div class="flex items-baseline justify-between gap-2">
                                <span class="text-base-content/60 min-w-0 text-xs">
                                    {tab === "dimacs" && uploaded?.note}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowDimacs(!showDimacs)}
                                    aria-expanded={showDimacs}
                                    class="btn btn-ghost btn-xs gap-1 font-normal"
                                >
                                    <Chevron open={showDimacs} />
                                    DIMACS
                                </button>
                            </div>

                            {showDimacs && (
                                <pre class="border-base-300 bg-base-200 max-h-48 overflow-auto rounded border p-2 font-mono text-xs">
                                    {dimacs}
                                </pre>
                            )}
                        </div>
                    )}

                    <SampleList busy={busy} onPick={loadSample} />

                    <div class="border-base-300 flex items-start justify-between gap-3 border-t pt-3">
                        <SolverOptions
                            id={`${ids}-flags`}
                            solver={solver}
                            flagText={flagState.text}
                            setFlagText={flagState.setText}
                            flags={flagState.flags}
                            cnfName={formulaFile?.name ?? "formula.cnf"}
                            busy={busy}
                        />

                        <div class="flex shrink-0 items-center gap-2">
                            <span class="text-base-content/50 text-xs">
                                {blocked()}
                            </span>
                            <button
                                type="button"
                                onClick={() => void run()}
                                disabled={!canRun}
                                class="btn btn-primary btn-sm gap-1"
                            >
                                <Play size={14} />
                                Run
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function Tab({
    id,
    tab,
    set,
    children,
}: {
    id: TabId;
    tab: TabId;
    set: (next: TabId) => void;
    children: string;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => set(id)}
            class={cn("tab", tab === id && "tab-active")}
        >
            {children}
        </button>
    );
}

export function Chevron({ open }: { open: boolean }) {
    return open ? <ChevronDown size={13} /> : <ChevronRight size={13} />;
}
