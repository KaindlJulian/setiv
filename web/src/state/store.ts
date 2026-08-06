import { batch, computed, signal, type ReadonlySignal } from "@preact/signals";
import { formulaText as renderFormula } from "../lib/format";
import { isAliveAt } from "../model/clauseDatabase";
import { SUPPORTED_PROTOCOL_VERSION, type SolverEvent } from "../model/events";
import {
    buildImplicationGraph,
    coneNodeThreshold,
    coneOf,
    type ImplicationGraph,
} from "../model/implicationGraph";
import { parseEventLog, type ParseIssue } from "../model/parse";
import { buildRun, type ConflictRecord, type SolverRun } from "../model/run";
import { buildTimeline, type Timeline } from "../model/timeline";
import { replayTo, type SolverState } from "../model/trail";

export interface ClauseCounts {
    original: number;
    learned: number;
    deleted: number;
}

/**
 * Single source of truth for the app state. Built from the solver logs.
 */
export interface SolverStore {
    run: ReadonlySignal<SolverRun | null>; // holds all the parsed data, source of truth
    fileName: ReadonlySignal<string>;
    rawText: ReadonlySignal<string>;
    parseIssues: ReadonlySignal<ParseIssue[]>;
    loadError: ReadonlySignal<string | null>;

    stepIndex: ReadonlySignal<number>;
    committedStep: ReadonlySignal<number>;
    maxStep: ReadonlySignal<number>;

    formulaText: ReadonlySignal<string>;
    conflicts: ReadonlySignal<ConflictRecord[]>;
    /** -1 until the first conflict is reached. */
    selectedConflictIndex: ReadonlySignal<number>;
    selectedConflict: ReadonlySignal<ConflictRecord | null>;

    /** The selected conflict's whole trail. */
    fullGraph: ReadonlySignal<ImplicationGraph | null>;
    /** The same conflict narrowed to κ and its ancestors. */
    coneGraph: ReadonlySignal<ImplicationGraph | null>;
    /** Whether the full graph is large enough to be drawn as a cone first. */
    coneDefault: ReadonlySignal<boolean>;

    currentEvent: ReadonlySignal<SolverEvent | null>;

    /** Decision level per event index; only built once a consumer asks. */
    timeline: ReadonlySignal<Timeline | null>;

    solverState: ReadonlySignal<SolverState | null>;
    clauseCounts: ReadonlySignal<ClauseCounts>;

    // actions
    loadLog(text: string, name: string): void;
    setLoadError(message: string, name?: string): void;
    selectConflict(index: number): void;
    setStep(step: number): void;
    commitStep(): void;
    stepBy(delta: number): void;
    stepToConflict(direction: 1 | -1): void;
}

const noCounts: ClauseCounts = { original: 0, learned: 0, deleted: 0 };

function versionError(version: number | null): string | null {
    if (version === SUPPORTED_PROTOCOL_VERSION) {
        return null;
    }

    const found =
        version === null
            ? "carries no `protocol_version` on its `init` event, so it predates version 2"
            : `is protocol version ${version}`;

    return `This log ${found}. This build reads version ${SUPPORTED_PROTOCOL_VERSION}; regenerate the log with the current solver.`;
}

export function createSolverStore(): SolverStore {
    const fileName = signal("");
    const rawText = signal("");
    const run = signal<SolverRun | null>(null);
    const parseIssues = signal<ParseIssue[]>([]);
    const loadError = signal<string | null>(null);
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

    /**
     * Memoized per conflict index to survive scrubbing
     */
    let graphCache = new Map<number, ImplicationGraph | null>();
    let coneCache = new Map<number, ImplicationGraph | null>();
    let graphCacheRun: SolverRun | null = null;

    const fullGraph = computed(() => {
        const r = run.value;

        if (!r) {
            return null;
        }

        if (graphCacheRun !== r) {
            graphCache = new Map();
            coneCache = new Map();
            graphCacheRun = r;
        }

        const index = selectedConflictIndex.value;

        if (!graphCache.has(index)) {
            graphCache.set(index, buildImplicationGraph(r, index));
        }

        return graphCache.get(index) ?? null;
    });

    const coneGraph = computed(() => {
        const full = fullGraph.value;

        if (!full) {
            return null;
        }

        const index = selectedConflictIndex.value;

        if (!coneCache.has(index)) {
            coneCache.set(index, coneOf(full));
        }

        return coneCache.get(index) ?? null;
    });

    /** which graph to draw first */
    const coneDefault = computed(
        () => (fullGraph.value?.nodes.length ?? 0) > coneNodeThreshold,
    );

    const currentEvent = computed(
        () => run.value?.events[stepIndex.value] ?? null,
    );

    const timeline = computed(() => {
        const r = run.value;
        return r ? buildTimeline(r) : null;
    });

    const solverState = computed(() => {
        const r = run.value;
        return r ? replayTo(r, stepIndex.value) : null;
    });

    // Counting loop, runs on every tick of a drag
    const clauseCounts = computed<ClauseCounts>(() => {
        const r = run.value;

        if (!r) {
            return noCounts;
        }

        const step = stepIndex.value;
        let original = 0;
        let learned = 0;
        let deleted = 0;

        for (const record of r.clauses.clauses) {
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

    const formulaText = computed(() => renderFormula(run.value?.init ?? null));

    const clampStep = (step: number) =>
        Math.min(Math.max(step, 0), maxStep.value);

    const loadLog = (text: string, name: string) => {
        const { events, issues, protocolVersion } = parseEventLog(text);

        const rejection =
            events.length === 0
                ? "No solver events found. Is this an NDJSON event log?"
                : versionError(protocolVersion);

        if (rejection) {
            batch(() => {
                fileName.value = name;
                rawText.value = text;
                run.value = null;
                parseIssues.value = issues;
                loadError.value = rejection;
                stepIndex.value = 0;
                committedStep.value = 0;
            });
            return;
        }

        const next = buildRun(events);
        const start = next.conflicts[0]?.eventIndex ?? 0;

        batch(() => {
            fileName.value = name;
            rawText.value = text;
            run.value = next;
            parseIssues.value = issues;
            loadError.value = null;
            stepIndex.value = start;
            committedStep.value = start;
        });
    };

    const setLoadError = (message: string, name = "") => {
        batch(() => {
            fileName.value = name;
            rawText.value = "";
            run.value = null;
            parseIssues.value = [];
            loadError.value = message;
            stepIndex.value = 0;
            committedStep.value = 0;
        });
    };

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
        fileName,
        rawText,
        run,
        parseIssues,
        loadError,
        stepIndex,
        committedStep,
        conflicts,
        selectedConflictIndex,
        selectedConflict,
        fullGraph,
        coneGraph,
        coneDefault,
        currentEvent,
        timeline,
        solverState,
        clauseCounts,
        maxStep,
        formulaText,
        loadLog,
        setLoadError,
        selectConflict,
        setStep,
        commitStep,
        stepBy,
        stepToConflict,
    };
}
