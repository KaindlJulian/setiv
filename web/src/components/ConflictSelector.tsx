import { cn } from "../lib/cn";
import { useSolverStore } from "../state/context";

export function ConflictSelector() {
    const store = useSolverStore();
    const conflicts = store.conflicts.value;
    const selected = store.selectedConflictIndex.value;

    if (conflicts.length === 0) {
        return null;
    }

    return (
        <div class="flex flex-wrap items-center gap-1">
            <span class="mr-1 text-xs text-gray-500">Conflicts:</span>
            {conflicts.map((c, i) => (
                <button
                    key={c.index}
                    onClick={() => store.selectConflict(i)}
                    title={`clause ${c.clauseId} @ level ${c.level}`}
                    class={cn(
                        "cursor-pointer rounded border px-2 py-1 text-xs",
                        i === selected
                            ? "border-red-700 bg-red-600 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100",
                    )}
                >
                    #{c.index}
                    <span class="ml-1 opacity-70">
                        (c{c.clauseId} @ {c.level})
                    </span>
                </button>
            ))}
        </div>
    );
}
