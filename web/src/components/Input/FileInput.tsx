import { cn } from "@/lib/cn";
import { compileFormula, type CompileResult } from "@/lib/compile";
import { solvers } from "@/model/solvers";
import { useSource } from "@/state/context";
import { selectedSolver, selectedSolverId } from "@/state/solverSelection";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { FormulaEditor } from "./FormulaEditor";
import { SolverCard } from "./SolverCard";
import { sampleFormulas } from "./samples";

interface Uploaded {
    file: File;
    text: string;
}

interface Preview {
    body: string;
    variables: number;
    clauses: number;
}

function previewOfCompiled(compiled: CompileResult | null): Preview | null {
    if (!compiled?.ok) {
        return null;
    }

    return {
        body: compiled.dimacs,
        variables: compiled.variables,
        clauses: compiled.clauses,
    };
}

function previewOf(uploaded: Uploaded | null): Preview | null {
    if (!uploaded) {
        return null;
    }

    const header = /^p\s+cnf\s+(\d+)\s+(\d+)/m.exec(uploaded.text);

    return {
        body: uploaded.text,
        variables: Number(header?.[1] ?? 0),
        clauses: Number(header?.[2] ?? 0),
    };
}

export function FileInput({ onSettled }: { onSettled?: () => void }) {
    const source = useSource();
    const status = source.status.value;
    const solver = selectedSolver.value;

    const [tab, setTab] = useState<"upload" | "text">("text");
    const [text, setText] = useState("");
    const [uploaded, setUploaded] = useState<Uploaded | null>(null);
    const [configOpen, setConfigOpen] = useState(false);

    const formulaInput = useRef<HTMLInputElement>(null);
    const pick = useRef(0);

    const compiled = useMemo(
        () => (text.trim() ? compileFormula(text) : null),
        [text],
    );

    const compiledCnfFile = useMemo(
        () =>
            compiled?.ok
                ? new File([compiled.dimacs], "formula.cnf", {
                      type: "text/plain",
                  })
                : null,
        [compiled],
    );

    const formulaFile =
        tab === "text" ? compiledCnfFile : (uploaded?.file ?? null);

    const preview = useMemo(
        () =>
            tab === "text" ? previewOfCompiled(compiled) : previewOf(uploaded),
        [tab, compiled, uploaded],
    );

    const handleLog = async (file: File | undefined) => {
        if (!file) {
            return;
        }
        await source.loadLogFile(file);
        onSettled?.();
    };

    const handleFormula = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        const id = ++pick.current;
        const text = await file.text();

        if (pick.current !== id) {
            return;
        }

        setUploaded({ file, text });
        setTab("upload");
        setConfigOpen(true);
    };

    useEffect(() => {
        if (!formulaInput.current || !uploaded) {
            return;
        }
        const picked = new DataTransfer();
        picked.items.add(uploaded.file);
        formulaInput.current.files = picked.files;
    }, [uploaded, tab]);

    const loadSample = async (name: string) => {
        const url = `${import.meta.env.BASE_URL}samples/${name}`;
        try {
            const res = await fetch(url);
            if (res.ok) {
                const blob = await res.blob();
                const file = new File([blob], name);
                handleFormula(file);
            } else {
                source.setLoadError(
                    `Could not load sample ${name} (HTTP ${res.status}).`,
                    name,
                );
            }
        } catch (err) {
            source.setLoadError(`Could not load sample ${name}: ${err}`, name);
        }
    };

    return (
        <div class="flex flex-col gap-3">
            <div class="flex items-end gap-2">
                <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span class="text-sm font-medium">
                        <label for="input-tabslist">Input</label>
                    </span>
                    <div
                        id="input-tabslist"
                        role="tablist"
                        class="tabs tabs-box tabs-xs"
                    >
                        <button
                            role="tab"
                            type="button"
                            onClick={() => setTab("text")}
                            class={cn("tab", tab === "text" && "tab-active")}
                        >
                            Limboole Formula
                        </button>
                        <button
                            role="tab"
                            type="button"
                            onClick={() => setTab("upload")}
                            class={cn("tab", tab === "upload" && "tab-active")}
                        >
                            DIMACS File
                        </button>
                    </div>
                </div>
                <div class="flex w-32 shrink-0 flex-col gap-1.5">
                    <span class="text-sm font-medium">
                        <label for="solver-select">Solver</label>
                    </span>
                    <select
                        id="solver-select"
                        value={selectedSolverId.value}
                        onChange={(e) => {
                            const id = e.currentTarget.value;
                            selectedSolverId.value = id;
                            setConfigOpen(id !== "");
                        }}
                        disabled={status !== "idle"}
                        class="select select-sm w-full"
                    >
                        <option value="">None</option>
                        {solvers.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {tab === "text" ? (
                <FormulaEditor
                    text={text}
                    setText={setText}
                    compiled={compiled}
                    showError={true}
                    busy={status !== "idle"}
                />
            ) : (
                <input
                    ref={formulaInput}
                    type="file"
                    accept=".dimacs,.cnf,.*"
                    aria-label="CNF formula"
                    onChange={(e) => {
                        const input = e.currentTarget;
                        handleFormula(input.files?.[0]);
                    }}
                    class="file-input file-input-sm w-full"
                    disabled={status !== "idle"}
                />
            )}

            {preview && (
                <>
                    <p class="text-base-content/60 text-xs">
                        DIMACS: {preview.variables} variables, {preview.clauses}{" "}
                        clauses
                    </p>

                    <pre class="border-base-300 bg-base-200 mt-1 max-h-48 overflow-auto rounded border p-2 font-mono text-xs">
                        {preview.body}
                    </pre>
                </>
            )}

            <div class={cn("flex flex-col gap-1.5")}>
                <span class="text-sm font-medium">Example Formulas</span>
                <div class="flex flex-wrap gap-1">
                    {sampleFormulas.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => loadSample(s)}
                            disabled={status !== "idle"}
                            class="btn btn-xs font-mono font-normal"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {formulaFile !== null && solver === null && (
                <p class="text-error text-xs">
                    Pick a solver to configure the run.
                </p>
            )}

            {solver && (formulaFile !== null || configOpen) && (
                <SolverCard
                    key={solver.id}
                    solver={solver}
                    file={formulaFile}
                    names={compiled?.ok ? compiled.names : null}
                    onRun={onSettled}
                />
            )}

            <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium">Load a solver event log</span>
                <input
                    type="file"
                    accept=".jsonl,.ndjson"
                    onChange={(e) => {
                        const input = e.currentTarget as HTMLInputElement;
                        void handleLog(input.files?.[0]);
                        input.value = "";
                    }}
                    disabled={status !== "idle"}
                    class="file-input file-input-sm w-full"
                />
            </label>
        </div>
    );
}
