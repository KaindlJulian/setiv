import { ChevronLeft, ChevronRight } from "lucide-preact";
import { useCursor } from "../state/context";

/**
 * A dropdown
 */
export function ConflictSelector() {
    const cursor = useCursor();
    const conflicts = cursor.conflicts.value;
    const selected = cursor.selectedConflictIndex.value;

    if (conflicts.length === 0) {
        return null;
    }

    return (
        <div class="join">
            <button
                type="button"
                title="Previous conflict"
                aria-label="Previous conflict"
                disabled={selected <= 0}
                onClick={() => cursor.selectConflict(selected - 1)}
                class="btn join-item btn-square btn-xs"
            >
                <ChevronLeft size={13} />
            </button>

            <select
                aria-label="Conflict"
                value={selected}
                onChange={(e) =>
                    cursor.selectConflict(Number(e.currentTarget.value))
                }
                class="join-item select select-xs w-52 font-mono"
            >
                {selected < 0 && (
                    <option value={-1} disabled>
                        no conflict yet
                    </option>
                )}
                {conflicts.map((c, i) => (
                    <option key={c.index} value={i}>
                        #{c.index} - c{c.clauseId} @{c.level}
                    </option>
                ))}
            </select>

            <button
                type="button"
                title="Next conflict"
                aria-label="Next conflict"
                disabled={selected >= conflicts.length - 1}
                onClick={() => cursor.selectConflict(selected + 1)}
                class="btn join-item btn-square btn-xs"
            >
                <ChevronRight size={13} />
            </button>
        </div>
    );
}
