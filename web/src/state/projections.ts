import { computed, type ReadonlySignal } from "@preact/signals";
import { formulaText as renderFormula } from "../lib/format";
import { clauseCountsAt, type ClauseCounts } from "../model/clauseDatabase";
import { type SolverRun } from "../model/run";
import { buildTimeline, type Timeline } from "../model/timeline";
import { createReplay, type Replay, type SolverState } from "../model/trail";

export type { ClauseCounts };

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

    // One replay cursor per run, so stepping forward never refolds from zero.
    let replayFor: SolverRun | null = null;
    let replay: Replay | null = null;

    const solverState = computed(() => {
        const r = run.value;

        if (!r) {
            return null;
        }

        if (replayFor !== r || !replay) {
            replay = createReplay(r);
            replayFor = r;
        }

        return replay.stateAt(stepIndex.value);
    });

    // Runs on every tick of a drag, so it must not scan the clause DB.
    const clauseCounts = computed<ClauseCounts>(() => {
        const r = run.value;

        if (!r) {
            return { original: 0, learned: 0, deleted: 0 };
        }

        return clauseCountsAt(r.clauseDb, stepIndex.value);
    });

    return { formulaText, timeline, solverState, clauseCounts };
}
