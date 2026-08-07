import {
    batch,
    computed,
    effect,
    signal,
    type ReadonlySignal,
} from "@preact/signals";
import { type SolverEvent } from "../model/events";
import { type ConflictRecord, type SolverRun } from "../model/run";

/**
 * The single cursor into a run. Everything the app shows depends on the current
 * step.
 */
export interface CursorStore {
    stepIndex: ReadonlySignal<number>;
    committedStep: ReadonlySignal<number>;
    maxStep: ReadonlySignal<number>;

    currentEvent: ReadonlySignal<SolverEvent | null>;

    conflicts: ReadonlySignal<ConflictRecord[]>;
    /** -1 until the first conflict is reached. */
    selectedConflictIndex: ReadonlySignal<number>;
    selectedConflict: ReadonlySignal<ConflictRecord | null>;

    selectConflict(index: number): void;
    setStep(step: number): void;
    commitStep(): void;
    stepBy(delta: number): void;
    stepToConflict(direction: 1 | -1): void;
}

export function createCursorStore(
    run: ReadonlySignal<SolverRun | null>,
): CursorStore {
    const stepIndex = signal(0);
    const committedStep = signal(0);

    const conflicts = computed(() => run.value?.conflicts ?? []);

    const maxStep = computed(() => {
        const r = run.value;

        if (!r || r.events.length === 0) {
            return 0;
        }

        return r.events.length - 1;
    });

    // this updates the cursor when run is changed
    effect(() => {
        const start = run.value?.conflicts[0]?.eventIndex ?? 0;

        batch(() => {
            stepIndex.value = start;
            committedStep.value = start;
        });
    });

    // Derived rather than stored, so the step is the only cursor in the app.
    const selectedConflictIndex = computed(() => {
        const list = conflicts.value;
        const step = committedStep.value;

        let lo = 0;
        let hi = list.length - 1;
        let found = -1;

        while (lo <= hi) {
            const mid = (lo + hi) >> 1;

            if (list[mid].eventIndex <= step) {
                found = mid;
                lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }

        return found;
    });

    const selectedConflict = computed(
        () => conflicts.value[selectedConflictIndex.value] ?? null,
    );

    const currentEvent = computed(
        () => run.value?.events[stepIndex.value] ?? null,
    );

    const clampStep = (step: number) =>
        Math.min(Math.max(step, 0), maxStep.value);

    const setStep = (step: number) => {
        stepIndex.value = clampStep(step);
    };

    const commitStep = () => {
        committedStep.value = stepIndex.value;
    };

    const jumpTo = (step: number) => {
        const target = clampStep(step);

        batch(() => {
            stepIndex.value = target;
            committedStep.value = target;
        });
    };

    const selectConflict = (index: number) => {
        const list = conflicts.value;

        if (list.length === 0) {
            return;
        }

        const clamped = Math.min(Math.max(index, 0), list.length - 1);
        jumpTo(list[clamped].eventIndex);
    };

    const stepBy = (delta: number) => {
        jumpTo(stepIndex.value + delta);
    };

    const stepToConflict = (direction: 1 | -1) => {
        const list = conflicts.value;

        if (list.length === 0) {
            return;
        }

        const step = stepIndex.value;
        const next =
            direction === 1
                ? list.find((c) => c.eventIndex > step)
                : [...list].reverse().find((c) => c.eventIndex < step);

        if (next) {
            jumpTo(next.eventIndex);
        }
    };

    return {
        stepIndex,
        committedStep,
        maxStep,
        currentEvent,
        conflicts,
        selectedConflictIndex,
        selectedConflict,
        selectConflict,
        setStep,
        commitStep,
        stepBy,
        stepToConflict,
    };
}
