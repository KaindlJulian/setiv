import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-preact";
import type { RefObject } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { useRowVirtualizer } from "../hooks/useRowVirtualizer";
import { cn } from "../lib/cn";
import type { ConflictRecord } from "../model/run";
import { useCursor } from "../state/context";

const rowHeight = 20;
/** Keep in sync with `max-h-64` on the list. */
const listHeight = 256;

const conflictLabel = (c: ConflictRecord) =>
    `#${c.eventIndex} - c${c.clauseId} @${c.level}`;

export function ConflictSelector() {
    const cursor = useCursor();
    const conflicts = cursor.conflicts.value;
    const selected = cursor.selectedConflictIndex.value;

    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    if (conflicts.length === 0) {
        return null;
    }

    const pick = (index: number) => {
        cursor.selectConflict(index);
        setOpen(false);
        triggerRef.current?.focus();
    };

    return (
        <>
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

                <button
                    type="button"
                    ref={triggerRef}
                    aria-label="Conflict"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    onClick={() => setOpen(!open)}
                    class="btn join-item btn-xs w-52 justify-between font-mono font-normal"
                >
                    {selected < 0
                        ? "no conflict yet"
                        : conflictLabel(conflicts[selected])}
                    <ChevronDown size={13} />
                </button>

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

            {open && (
                <ConflictList
                    anchor={triggerRef}
                    conflicts={conflicts}
                    selected={selected}
                    onPick={pick}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
}

interface ConflictListProps {
    anchor: RefObject<HTMLButtonElement>;
    conflicts: ConflictRecord[];
    selected: number;
    onPick: (index: number) => void;
    onClose: () => void;
}

/**
 * The conflict list, mounted only while open.
 *
 * rows are virtualized
 */
function ConflictList({
    anchor,
    conflicts,
    selected,
    onPick,
    onClose,
}: ConflictListProps) {
    const [active, setActive] = useState(Math.max(selected, 0));
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const window = useRowVirtualizer(conflicts.length, rowHeight);

    useLayoutEffect(() => {
        const rect = anchor.current?.getBoundingClientRect();

        if (rect) {
            const below = rect.bottom + 4;
            const fits =
                below + listHeight <= document.documentElement.clientHeight;

            setPos({
                top: fits ? below : Math.max(rect.top - 4 - listHeight, 4),
                left: rect.left,
            });
        }

        const el = window.ref.current;

        if (el) {
            el.scrollTop =
                Math.max(selected, 0) * rowHeight -
                (listHeight - rowHeight) / 2;
            el.focus();
        }
    }, []);

    const onKeyDown = (e: KeyboardEvent) => {
        e.stopPropagation();

        let next: number;

        switch (e.key) {
            case "ArrowDown":
                next = Math.min(active + 1, conflicts.length - 1);
                break;
            case "ArrowUp":
                next = Math.max(active - 1, 0);
                break;
            case "Home":
                next = 0;
                break;
            case "End":
                next = conflicts.length - 1;
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                onPick(active);
                return;
            case "Escape":
                e.preventDefault();
                onClose();
                return;
            default:
                return;
        }

        e.preventDefault();
        setActive(next);
        window.scrollToIndex(next);
    };

    const rows = [];

    for (const item of window.items) {
        const conflict = conflicts[item.index];

        rows.push(
            <button
                key={conflict.index}
                type="button"
                role="option"
                aria-selected={item.index === selected}
                onClick={() => onPick(item.index)}
                class={cn(
                    "hover:bg-base-300 flex h-5 w-full items-center px-2 text-left font-mono text-xs whitespace-nowrap",
                    item.index === active && "bg-base-300",
                    item.index === selected && "text-primary font-semibold",
                )}
            >
                {conflictLabel(conflict)}
            </button>,
        );
    }

    return (
        <>
            <div class="fixed inset-0 z-40" onMouseDown={onClose} />
            <div
                ref={window.ref}
                role="listbox"
                tabIndex={-1}
                onKeyDown={onKeyDown}
                style={{
                    top: pos?.top ?? 0,
                    left: pos?.left ?? 0,
                    visibility: pos ? "visible" : "hidden",
                }}
                class="border-base-300 bg-base-100 fixed z-50 max-h-64 w-52 overflow-y-auto rounded-sm border shadow-lg"
            >
                <div style={{ height: window.topPad }} />
                {rows}
                <div style={{ height: window.bottomPad }} />
            </div>
        </>
    );
}
