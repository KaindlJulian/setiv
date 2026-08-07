import { computed, type ReadonlySignal } from "@preact/signals";
import { formulaText as renderFormula } from "../lib/format";
import { isAliveAt } from "../model/clauseDatabase";
import { type SolverRun } from "../model/run";
import { buildTimeline, type Timeline } from "../model/timeline";
import { replayTo, type SolverState } from "../model/trail";

export interface ClauseCounts {
    original: number;
    learned: number;
    deleted: number;
}

/**
 * Read-only views of the run at the cursor. Each is a pure `(run, step) => X`
 * over the `model/` layer
 */
export interface RunProjections {
    formulaText: ReadonlySignal<string>;
    timeline: ReadonlySignal<Timeline | null>;
    solverState: ReadonlySignal<SolverState | null>;
    clauseCounts: ReadonlySignal<ClauseCounts>;
}

export function createProjections(
    run: ReadonlySignal<SolverRun | null>,
    stepIndex: ReadonlySignal<number>,
): RunProjections {
    const formulaText = computed(() => renderFormula(run.value?.init ?? null));

    const timeline = computed(() => {
        const r = run.value;
        return r ? buildTimeline(r) : null;
    });

    const solverState = computed(() => {
        const r = run.value;
        return r ? replayTo(r, stepIndex.value) : null;
    });

    // runs on every tick of a drag
    const clauseCounts = computed<ClauseCounts>(() => {
        const r = run.value;

        if (!r) {
            return { original: 0, learned: 0, deleted: 0 };
        }

        const step = stepIndex.value;
        let original = 0;
        let learned = 0;
        let deleted = 0;

        for (const record of r.clauseDb.clauses) {
            if (record.addedAt > step) {
                continue;
            }

            if (isAliveAt(record, step)) {
                if (record.origin === "original") {
                    original++;
                } else {
                    learned++;
                }
            } else {
                deleted++;
            }
        }

        return { original, learned, deleted };
    });

    return { formulaText, timeline, solverState, clauseCounts };
}
