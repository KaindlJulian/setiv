import { useSource } from "../state/context";

const sample = [
    "cadical_php_4_3_events.jsonl",
    "cadical_shrink_php_4_3_events.jsonl",
    "cadical_php_3_2_events.jsonl",
    "cadical_e3220_events.jsonl",
    "cadical_full_2_events.jsonl",
    "cadical_prime529_events.jsonl",
    "cadical_bf0432-007_events.jsonl",
    "cadical_ssa2670-141_events.jsonl",
];

interface FileInputProps {
    onSettled?: () => void;
}

export function FileInput({ onSettled }: FileInputProps) {
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
            <label class="flex flex-col gap-1.5">
                <span class="text-red text-sm font-medium">CNF Formula</span>
                <input
                    type="file"
                    accept=".jsonl,.ndjson"
                    onChange={() => alert("todo")}
                    class="file-input file-input-sm w-full"
                    disabled
                />
            </label>
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
                    {sample.map((s) => (
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
