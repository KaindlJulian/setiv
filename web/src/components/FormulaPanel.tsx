import { ClauseChips } from "@/components/ClauseChips";
import { Legend, type LegendItem } from "@/components/Legend";
import { Panel } from "@/components/Panel";
import { ScopeToggle, type ScopeOption } from "@/components/ScopeToggle";
import { useScaledRowWindow } from "@/hooks/useScaledRowWindow";
import { cn } from "@/lib/cn";
import type { ClauseRecord } from "@/model/clauseDatabase";
import {
    clauseStatus,
    litValue,
    type ClauseStatus,
    type SolverState,
} from "@/model/trail";
import { useProjections, useSource, useView } from "@/state/context";
import { useState } from "preact/hooks";

const land = "∧";
const rowHeight = 20;

type Mode = "lines" | "flow";
type Highlight = "clauses" | "literals";

const modes: ScopeOption<Mode>[] = [
    {
        value: "lines",
        label: "Lines",
        title: "One clause per line, with its id in the gutter",
    },
    {
        value: "flow",
        label: "Continuous",
        title: "The formula as 'flowing text'",
    },
];

const lineBackgroundTint: Record<ClauseStatus, string> = {
    satisfied: "bg-setiv-true/10",
    falsified: "bg-setiv-false/10",
    unit: "bg-warning/15",
    open: "",
};

const clauseLegend: LegendItem[] = [
    { shape: "chip", label: "satisfied", fill: "fill-setiv-true/30" },
    { shape: "chip", label: "falsified", fill: "fill-setiv-false/30" },
    { shape: "chip", label: "unit", fill: "fill-warning/40" },
];

const literalLegend: LegendItem[] = [
    { shape: "chip", label: "true", fill: "fill-setiv-true/20" },
    { shape: "chip", label: "false", fill: "fill-setiv-false/20" },
    { shape: "chip", label: "unassigned", fill: "fill-base-200" },
];

/**
 * The formula as by the init event, live under the assignment at the cursor.
 */
export function FormulaPanel() {
    const run = useSource().run.value;
    const state = useProjections().solverState.value;
    const [mode, setMode] = useState<Mode>("lines");
    const [highlight, setHighlight] = useState<Highlight>("clauses");

    const clauses = run?.clauseDb.clauses ?? [];
    const count = run?.clauseDb.firstLearnedIndex ?? 0;

    return (
        <Panel
            fill
            title={`Formula (${count} clauses)`}
            actions={
                <div class="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            setHighlight(
                                highlight === "clauses"
                                    ? "literals"
                                    : "clauses",
                            )
                        }
                        class="btn btn-xs"
                    >
                        {highlight === "clauses"
                            ? "Highlight literals"
                            : "Highlight clauses"}
                    </button>
                    <ScopeToggle
                        scopes={modes}
                        value={mode}
                        onChange={setMode}
                    />
                </div>
            }
        >
            {count === 0 || !state ? (
                <p class="text-base-content/40 flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm">
                    No formula in this log.
                </p>
            ) : (
                <div class="flex min-h-0 flex-1 flex-col">
                    {mode === "lines" ? (
                        <ClauseLines
                            clauses={clauses}
                            count={count}
                            state={state}
                            highlight={highlight}
                        />
                    ) : (
                        <ClauseFlow
                            clauses={clauses}
                            count={count}
                            state={state}
                            highlight={highlight}
                        />
                    )}
                    <Legend
                        items={
                            highlight === "clauses"
                                ? clauseLegend
                                : literalLegend
                        }
                    />
                </div>
            )}
        </Panel>
    );
}

interface ClausesProps {
    clauses: ClauseRecord[];
    count: number;
    state: SolverState;
    highlight: Highlight;
}

function ClauseLines({ clauses, count, state, highlight }: ClausesProps) {
    const window = useScaledRowWindow(count, rowHeight);
    const view = useView();
    const rows = [];

    for (let i = window.start; i < window.end; i++) {
        const record = clauses[i];

        rows.push(
            <div
                key={record.key}
                class={cn(
                    "flex h-5 items-center gap-2 px-2 font-mono text-xs whitespace-nowrap",
                    highlight === "clauses" &&
                        lineBackgroundTint[
                            clauseStatus(record.literals, state)
                        ],
                )}
            >
                <span
                    onClick={() => view.revealClause(record.id)}
                    class="text-base-content/40 hover:text-base-content w-14 shrink-0 cursor-pointer truncate select-none hover:underline"
                >
                    {record.key}
                </span>
                <span class="text-base-content/40">(</span>
                <ClauseChips
                    literals={record.literals}
                    valueOf={(lit) => litValue(lit, state)}
                    max={Infinity}
                    tint={highlight === "literals"}
                    class="mt-0 flex-nowrap"
                />
                <span class="text-base-content/40">)</span>
                {i < count - 1 && (
                    <span class="text-base-content/40">{land}</span>
                )}
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

function ClauseFlow({ clauses, count, state, highlight }: ClausesProps) {
    const groups = [];

    if (count > 500) {
        return (
            <p class="text-base-content/40 flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm">
                For 500+ clauses, this view is disabled.
            </p>
        );
    }

    for (let i = 0; i < count; i++) {
        const record = clauses[i];

        groups.push(
            <div key={record.key} class="flex items-center gap-1.5">
                <div
                    title={record.key}
                    class={cn(
                        "border-base-300 rounded border p-1",
                        highlight === "clauses" &&
                            lineBackgroundTint[
                                clauseStatus(record.literals, state)
                            ],
                    )}
                >
                    <ClauseChips
                        literals={record.literals}
                        valueOf={(lit) => litValue(lit, state)}
                        max={Infinity}
                        tint={highlight === "literals"}
                        class="mt-0"
                    />
                </div>
                {i < count - 1 && (
                    <span class="text-base-content/40 font-mono text-xs">
                        {land}
                    </span>
                )}
            </div>,
        );
    }

    return (
        <div class="min-h-0 flex-1 overflow-auto p-3">
            <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {groups}
            </div>
        </div>
    );
}
