import { solvers } from "@/model/solvers";
import { useSource } from "@/state/context";
import { selectedSolver, selectedSolverId } from "@/state/solverSelection";
import { useRef, useState } from "preact/hooks";
import { SolverCard } from "./SolverCard";

const sampleFormulas = [
    {
        name: "kcolor_2_3.cnf",
        description:
            "K coloring problem, with 2 colors and a 3 vertex complete graph (triangle).",
    },
    {
        name: "adder_miter_4bit.cnf",
        description:
            "Miter circuit comparing two 4-bit adder implementations. Satisfiable only by an assignment where the two adders disagree.",
    },
    {
        name: "chain_20.cnf",
        description:
            "Equivalence chain: x1 <-> x2 <-> ... <-> x20. A single decision propagates through the whole chain.",
    },
    {
        name: "op_8.cnf",
        description:
            "Ordering Principle: Encodes an impossible partial order over 8 elements, where each element is not minimal.",
    },
    {
        name: "peb_pyr3_xor2.cnf",
        description:
            "Pebbling formula for a pyramid of height 3, with every vertex substituted by the XOR of two variables.",
    },
    {
        name: "php_5_4.cnf",
        description:
            "Pigeonhole principle: Arrange 5 pigeons into 4 holes, one per hole. Hard for resolution.",
    },
    {
        name: "php_6_5.cnf",
        description:
            "Pigeonhole principle: Arrange 6 pigeons into 5 holes, one per hole. Hard for resolution.",
    },
    {
        name: "ramsey_3_3_5.cnf",
        description:
            "Two-coloring of the edges of K5 with no single-color triangle and no independent set of size 3. Satisfiable, 5-cycle.",
    },
    {
        name: "ramsey_3_3_6.cnf",
        description:
            "Two-coloring of the edges of K6 with no single-color triangle and no independent set of size 3. Unsatisfiable, R(3,3) = 6.",
    },
    {
        name: "tseitin_4reg_16.cnf",
        description:
            "Tseitin parity formula on a random 4-regular graph of 16 vertices with odd total charge.",
    },
];

export function FileInput({ onSettled }: { onSettled?: () => void }) {
    const source = useSource();
    const status = source.status.value;
    const busy = status !== "idle";

    const solver = selectedSolver.value;
    const [formula, setFormula] = useState<File | null>(null);
    const formulaInput = useRef<HTMLInputElement>(null);

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

        if (formulaInput.current) {
            const picked = new DataTransfer();
            picked.items.add(file);
            formulaInput.current.files = picked.files;
        }
    };

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
                <label class="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span class="text-sm font-medium">CNF Formula</span>
                    <input
                        ref={formulaInput}
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
                <p class="text-warning text-xs">
                    Pick a solver to configure the run.
                </p>
            )}

            <div class="flex flex-col gap-1.5">
                <span class="text-sm font-medium">Example Formulas</span>
                <div class="flex flex-wrap gap-1">
                    {sampleFormulas.map((s) => (
                        <button
                            key={s.name}
                            type="button"
                            onClick={() => loadSample(s.name)}
                            disabled={busy}
                            class="btn btn-xs font-mono font-normal"
                            title={s.description}
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>

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
        </div>
    );
}
