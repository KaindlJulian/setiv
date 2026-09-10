import { ClauseChips } from "@/components/ClauseChips";
import { Legend, type LegendItem } from "@/components/Legend";
import { Panel } from "@/components/Panel";
import { useScaledRowWindow } from "@/hooks/useScaledRowWindow";
import { cn } from "@/lib/cn";
import { eventStepBarText } from "@/lib/format";
import { clausesInSectionAt, type ClauseRecord } from "@/model/clauseDatabase";
import type { InspectEvent, InspectOutcome } from "@/model/events";
import { litValue, type SolverState } from "@/model/trail";
import { useCursor, useProjections, useSource } from "@/state/context";
import { useEffect, useMemo, useRef } from "preact/hooks";

const rowHeight = 20;

const outcomeTint: Record<InspectOutcome, string> = {
    satisfied: "bg-setiv-true/20",
    unit: "bg-warning/25",
    falsified: "bg-setiv-false/20",
    unresolved: "bg-base-300",
};

const legend: LegendItem[] = [
    { shape: "chip", label: "satisfied", fill: "fill-setiv-true/30" },
    { shape: "chip", label: "falsified", fill: "fill-setiv-false/30" },
    { shape: "chip", label: "unit", fill: "fill-warning/40" },
    {
        shape: "chip",
        label: "watched literal",
        fill: "fill-base-300",
        stroke: "border-primary",
    },
];

const noRecords: ClauseRecord[] = [];

export function BcpPanel({ active }: { active: boolean }) {
    const run = useSource().run.value;
    const cursor = useCursor();
    const state = useProjections().solverState.value;
    const step = cursor.stepIndex.value;

    const records = useMemo(() => {
        if (!run) {
            return noRecords;
        }

        const db = run.clauseDb;

        return [
            ...clausesInSectionAt(db, "original", step),
            ...clausesInSectionAt(db, "learned", step),
        ];
    }, [run, step]);

    const event = cursor.currentEvent.value;
    const inspect = event?.event === "inspect" ? event : null;
    const row = inspect
        ? records.findIndex((record) => record.id === inspect.clause_id)
        : -1;

    if (!run || !state) {
        return null;
    }

    if (run.stats.inspections === 0) {
        return;
    }

    return (
        <Panel
            fill
            title={`BCP (${run.stats.inspections} inspections)`}
            actions={
                <span class="text-base-content/60 font-mono text-xs">
                    {inspect ? eventStepBarText(inspect) : "not at an inspect"}
                </span>
            }
        >
            <div class="flex min-h-0 flex-1 flex-col">
                <ClauseRows
                    records={records}
                    state={state}
                    inspect={inspect}
                    row={row}
                    active={active}
                />
                <Legend items={legend} />
            </div>
        </Panel>
    );
}

interface RowsProps {
    records: ClauseRecord[];
    state: SolverState;
    inspect: InspectEvent | null;
    row: number;
    active: boolean;
}

function ClauseRows({ records, state, inspect, row, active }: RowsProps) {
    const window = useScaledRowWindow(records.length, rowHeight);

    const latest = useRef(window);
    latest.current = window;

    useEffect(() => {
        if (!active || row < 0 || window.viewport === 0) {
            return;
        }

        if (!latest.current.isRowVisible(row)) {
            latest.current.scrollToRow(row);
        }
    }, [row, active, window.viewport]);

    const rows = [];

    for (let i = window.start; i < window.end; i++) {
        const record = records[i];
        const looked = inspect !== null && i === row;

        rows.push(
            <div
                key={record.key}
                class={cn(
                    "flex h-5 items-center gap-2 px-2 font-mono text-xs whitespace-nowrap",
                    looked && outcomeTint[inspect.outcome],
                )}
            >
                <span class="text-base-content/40 w-14 shrink-0 truncate select-none">
                    {record.key}
                </span>
                <ClauseChips
                    literals={record.literals}
                    valueOf={(lit) => litValue(lit, state)}
                    watched={
                        looked
                            ? (inspect.next_watched ?? inspect.watched)
                            : undefined
                    }
                    unwatched={
                        looked && inspect.next_watched
                            ? inspect.watched
                            : undefined
                    }
                    max={Infinity}
                    class="mt-0 flex-nowrap"
                />
            </div>,
        );
    }

    return (
        <div ref={window.ref} class="min-h-0 flex-1 overflow-auto">
            <div class="relative" style={{ height: window.surface }}>
                <div
                    class="absolute left-0 w-max min-w-full"
                    style={{ top: window.offset }}
                >
                    {rows}
                </div>
            </div>
        </div>
    );
}
