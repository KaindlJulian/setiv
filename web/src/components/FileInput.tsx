import { solvers } from "@/model/solvers";
import { useSource } from "@/state/context";
import { selectedSolver, selectedSolverId } from "@/state/solverSelection";
import { useState } from "preact/hooks";
import { SolverCard } from "./SolverCard";

const logFiles = import.meta.glob("../../public/samples/*.jsonl", {
    query: "?url",
    import: "default",
});
const fileNames = Object.keys(logFiles).map((path) => {
    return path.split("/").pop() || "";
});

interface FileInputProps {
    onSettled?: () => void;
}

export function FileInput({ onSettled }: FileInputProps) {
    const source = useSource();
    const status = source.status.value;
    const busy = status !== "idle";

    const solver = selectedSolver.value;
    const [formula, setFormula] = useState<File | null>(null);
    /** Opened by picking a solver too, so the card doubles as the preset view. */
    const [configOpen, setConfigOpen] = useState(false);

    const handleLog = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        await source.loadLogFile(file);
        onSettled?.();
    };

    const handleFormula = (file: File | undefined) => {
        if (!file) {
            return;
        }

        setFormula(file);
        setConfigOpen(true);
    };

    const loadSample = async (name: string) => {
        const url = `${import.meta.env.BASE_URL}samples/${name}`;

        try {
            const res = await fetch(url);

            if (!res.ok) {
                source.setLoadError(
                    `Could not load sample ${name} (HTTP ${res.status}).`,
                    name,
                );
            } else {
                const blob = await res.blob();
                await source.loadLogFile(new File([blob], name));
            }
        } catch (err) {
            source.setLoadError(`Could not load sample ${name}: ${err}`, name);
        }

        onSettled?.();
    };

    return (
        <div class="flex flex-col gap-3">
            <div class="flex items-end gap-2">
                <label class="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span class="text-sm font-medium">CNF Formula</span>
                    <input
                        type="file"
                        accept=".cnf,.dimacs"
                        onChange={(e) => {
                            const input = e.currentTarget as HTMLInputElement;
                            handleFormula(input.files?.[0]);
                        }}
                        class="file-input file-input-sm w-full"
                        disabled={busy}
                    />
                </label>
                <div class="flex w-32 shrink-0 flex-col gap-1.5">
                    <span class="text-sm font-medium">
                        <label for="solver-select">Solver</label>
                    </span>
                    <select
                        id="solver-select"
                        value={selectedSolverId.value}
                        onChange={(e) => {
                            const id = (e.currentTarget as HTMLSelectElement)
                                .value;

                            selectedSolverId.value = id;
                            setConfigOpen(id !== "");
                        }}
                        disabled={busy}
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

            {solver && (formula !== null || configOpen) && (
                <SolverCard
                    key={solver.id}
                    solver={solver}
                    file={formula}
                    onRun={onSettled}
                />
            )}

            {formula !== null && solver === null && (
                <p class="text-base-content/60 text-xs">
                    Pick a solver to configure the run.
                </p>
            )}

            <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium">Solver event log</span>
                <input
                    type="file"
                    accept=".jsonl,.ndjson"
                    onChange={(e) => {
                        const input = e.currentTarget as HTMLInputElement;
                        void handleLog(input.files?.[0]);
                        input.value = "";
                    }}
                    disabled={busy}
                    class="file-input file-input-sm w-full"
                />
            </label>

            <div class="flex flex-col gap-1.5">
                <span class="text-sm font-medium">Example</span>
                <div class="flex flex-wrap gap-1">
                    {fileNames.map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => loadSample(s)}
                            disabled={busy}
                            class="btn btn-xs font-mono font-normal"
                        >
                            {s.replace("cadical_", "")}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
