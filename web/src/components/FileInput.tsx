import { solvers } from "@/model/solvers";
import { useSource } from "@/state/context";
import { selectedSolverId, solverInfoOpen } from "@/state/solverSelection";
import { Info } from "lucide-preact";

const logFiles = import.meta.glob("../../public/samples/*.jsonl", {
    query: "?url",
    import: "default",
});
const fileNames = Object.keys(logFiles).map((path) => {
    return path.split("/").pop() || "";
});

interface FileInputProps {
    onSettled?: () => void;
    showInfoToggle?: boolean;
}

export function FileInput({ onSettled, showInfoToggle }: FileInputProps) {
    const source = useSource();

    const handleFile = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        try {
            source.loadLog(await file.text(), file.name);
        } catch (err) {
            source.setLoadError(
                `Could not read ${file.name}: ${err}`,
                file.name,
            );
        }

        onSettled?.();
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
                source.loadLog(await res.text(), name);
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
                    <span class="text-red text-sm font-medium">
                        CNF Formula
                    </span>
                    <input
                        type="file"
                        accept=".cnf,.dimacs"
                        onChange={() => alert("todo")}
                        class="file-input file-input-sm w-full"
                        disabled
                    />
                </label>
                <div class="flex w-32 shrink-0 flex-col gap-1.5">
                    <span class="flex items-center justify-between gap-1 text-sm font-medium">
                        <label for="solver-select">Solver</label>
                        {showInfoToggle && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    solverInfoOpen.value =
                                        !solverInfoOpen.value;
                                }}
                                title="Solver details"
                                class="btn btn-ghost btn-xs px-1"
                            >
                                <Info size={13} />
                            </button>
                        )}
                    </span>
                    <select
                        id="solver-select"
                        value={selectedSolverId.value}
                        onChange={(e) => {
                            selectedSolverId.value = (
                                e.currentTarget as HTMLSelectElement
                            ).value;
                        }}
                        class="select select-sm w-full"
                    >
                        {solvers.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <label class="flex flex-col gap-1.5">
                <span class="text-sm font-medium">Solver event log</span>
                <input
                    type="file"
                    accept=".jsonl,.ndjson"
                    onChange={(e) =>
                        handleFile(
                            (e.currentTarget as HTMLInputElement).files?.[0],
                        )
                    }
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
