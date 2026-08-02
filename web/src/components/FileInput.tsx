import { useSolverStore } from "../state/context";

const sample = [
    "cadical_php_4_3_events.jsonl",
    "cadical_php_3_2_events.jsonl",
    "cadical_e3220_events.jsonl",
    "cadical_full_2_events.jsonl",
    "cadical_prime529_events.jsonl",
];

export function FileInput() {
    const store = useSolverStore();

    const handleFile = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        try {
            store.loadLog(await file.text(), file.name);
        } catch (err) {
            store.setLoadError(
                `Could not read ${file.name}: ${err}`,
                file.name,
            );
        }
    };

    const loadSample = async (name: string) => {
        const url = `${import.meta.env.BASE_URL}samples/${name}`;

        try {
            const res = await fetch(url);

            if (!res.ok) {
                store.setLoadError(
                    `Could not load sample ${name} (HTTP ${res.status}).`,
                    name,
                );
                return;
            }

            store.loadLog(await res.text(), name);
        } catch (err) {
            store.setLoadError(`Could not load sample ${name}: ${err}`, name);
        }
    };

    return (
        <div class="flex flex-col gap-2 rounded border border-gray-300 bg-gray-50 p-3">
            <label class="text-sm font-medium">Load solver event log</label>
            <input
                type="file"
                accept=".jsonl,.ndjson"
                onChange={(e) =>
                    handleFile((e.currentTarget as HTMLInputElement).files?.[0])
                }
                class="cursor-pointer border text-sm"
            />
            <div class="flex flex-wrap items-center gap-1 text-xs text-gray-500">
                <span>Load sample:</span>
                {sample.map((s) => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => loadSample(s)}
                        class="cursor-pointer rounded bg-gray-200 px-1 font-mono hover:bg-gray-300"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
}
