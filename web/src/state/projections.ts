import { clauseCountsAt, type ClauseCounts } from "@/model/clauseDatabase";
import type { SolverEvent } from "@/model/events";
import { type SolverRun } from "@/model/run";
import { buildTimeline, type Timeline } from "@/model/timeline";
import { createReplay, type Replay, type SolverState } from "@/model/trail";
import { computed, type ReadonlySignal } from "@preact/signals";

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
    /** At the selected conflict, for views that stay anchored there while the step moves. */
    conflictState: ReadonlySignal<SolverState | null>;
    clauseCounts: ReadonlySignal<ClauseCounts>;
}

export function createProjections(
    run: ReadonlySignal<SolverRun | null>,
    stepIndex: ReadonlySignal<number>,
    committedStep: ReadonlySignal<number>,
    conflictStep: ReadonlySignal<number>,
): RunProjections {
    const timeline = computed(() => {
        const r = run.value;
        return r ? buildTimeline(r) : null;
    });

    /**
     * One replay cursor per run, so stepping forward never refolds from zero.
     * Each step signal needs its own: a single cursor asked for two different
     * steps in turn would rewind to the previous checkpoint every time.
     *
     * The cache keys on the events array rather than the run object. A live
     * solver publishes a new run per batch over the same append-only array, and
     * a replay only ever reads events at or below its cursor, so those stay
     * valid. Keying on the run itself would throw the checkpoints away several
     * times a second and refold the whole prefix each time.
     */
    const stateAt = (step: ReadonlySignal<number>) => {
        let replayEvents: readonly SolverEvent[] | null = null;
        let replayVariables = -1;
        let replay: Replay | null = null;

        return computed(() => {
            const r = run.value;

            if (!r) {
                return null;
            }

            const variables = r.init?.variables ?? 0;

            if (
                !replay ||
                replayEvents !== r.events ||
                replayVariables !== variables
            ) {
                replay = createReplay(r);
                replayEvents = r.events;
                replayVariables = variables;
            }

            return replay.stateAt(step.value);
        });
    };

    const solverState = stateAt(stepIndex);
    const committedState = stateAt(committedStep);
    const conflictState = stateAt(conflictStep);

    // Runs on every tick of a drag, so it must not scan the clause DB.
    const clauseCounts = computed<ClauseCounts>(() => {
        const r = run.value;

        if (!r) {
            return { original: 0, learned: 0, deleted: 0 };
        }

        return clauseCountsAt(r.clauseDb, stepIndex.value);
    });

    return {
        timeline,
        solverState,
        committedState,
        conflictState,
        clauseCounts,
    };
}
