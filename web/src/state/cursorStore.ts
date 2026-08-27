import { type SolverEvent } from "@/model/events";
import { type ConflictRecord, type SolverRun } from "@/model/run";
import {
    batch,
    computed,
    effect,
    signal,
    type ReadonlySignal,
} from "@preact/signals";

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
    /** Step the conflict-anchored graph is taken at, -1 before the first conflict. */
    conflictStep: ReadonlySignal<number>;

    selectConflict(index: number): void;
    setStep(step: number): void;
    commitStep(): void;
    /** Move the live and the committed step at same time */
    jumpTo(step: number): void;

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
    const selectedConflictIndex = computed(() =>
        lastConflictAtOrBefore(conflicts.value, committedStep.value),
    );

    const selectedConflict = computed(
        () => conflicts.value[selectedConflictIndex.value] ?? null,
    );

    const conflictStep = computed(
        () => selectedConflict.value?.eventIndex ?? -1,
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
        // Forward: the one just past the last conflict at or before the step.
        // Backward: the last conflict strictly before the step.
        const next =
            direction === 1
                ? list[lastConflictAtOrBefore(list, step) + 1]
                : list[lastConflictAtOrBefore(list, step - 1)];

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
        conflictStep,
        selectConflict,
        setStep,
        jumpTo,
        commitStep,
        stepBy,
        stepToConflict,
    };
}

/**
 * binary search the index of the last conflict at or before `step`, or -1 if there is none
 */
function lastConflictAtOrBefore(
    list: readonly ConflictRecord[],
    step: number,
): number {
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
}
