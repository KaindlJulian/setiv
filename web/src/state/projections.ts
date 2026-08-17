import { computed, type ReadonlySignal } from "@preact/signals";
import { clauseCountsAt, type ClauseCounts } from "@/model/clauseDatabase";
import { type SolverRun } from "@/model/run";
import { buildTimeline, type Timeline } from "@/model/timeline";
import { createReplay, type Replay, type SolverState } from "@/model/trail";

export type { ClauseCounts };

/**
 * Read-only views of the run at the cursor. Each is a pure `(run, step) => X`
 * over the `model/` layer
 */
export interface RunProjections {
    timeline: ReadonlySignal<Timeline | null>;
    solverState: ReadonlySignal<SolverState | null>;
    /** At the committed step, for views too costly to rebuild on every drag tick. */
    committedState: ReadonlySignal<SolverState | null>;
    clauseCounts: ReadonlySignal<ClauseCounts>;
}

export function createProjections(
    run: ReadonlySignal<SolverRun | null>,
    stepIndex: ReadonlySignal<number>,
    committedStep: ReadonlySignal<number>,
): RunProjections {
    const timeline = computed(() => {
        const r = run.value;
        return r ? buildTimeline(r) : null;
    });

    /**
     * One replay cursor per run, so stepping forward never refolds from zero.
     * Each step signal needs its own: a single cursor asked for two different
     * steps in turn would rewind to the previous checkpoint every time.
     */
    const stateAt = (step: ReadonlySignal<number>) => {
        let replayFor: SolverRun | null = null;
        let replay: Replay | null = null;

        return computed(() => {
            const r = run.value;

            if (!r) {
                return null;
            }

            if (replayFor !== r || !replay) {
                replay = createReplay(r);
                replayFor = r;
            }

            return replay.stateAt(step.value);
        });
    };

    const solverState = stateAt(stepIndex);
    const committedState = stateAt(committedStep);

    // Runs on every tick of a drag, so it must not scan the clause DB.
    const clauseCounts = computed<ClauseCounts>(() => {
        const r = run.value;

        if (!r) {
            return { original: 0, learned: 0, deleted: 0 };
        }

        return clauseCountsAt(r.clauseDb, stepIndex.value);
    });

    return { timeline, solverState, committedState, clauseCounts };
}
