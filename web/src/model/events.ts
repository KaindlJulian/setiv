/** v3 only adds optional events and fields, so v2 logs still replay. */
export const SUPPORTED_PROTOCOL_VERSIONS: readonly string[] = ["2", "3"];

export interface ClauseListEntry {
    id: number;
    literals: number[];
}

export interface InitEvent {
    event: "init";
    protocol_version: string;
    variables: number;
    clauses: number;
    variable_ids: number[];
    clause_list: ClauseListEntry[];
}

export interface DecideEvent {
    event: "decide";
    literal: number;
    level: number;
    heuristic?: string;
}

export interface PropagateEvent {
    event: "propagate";
    literal: number;
    level: number;
    reason_clause_id: number | null;
    /** Optional: consumers resolve the antecedent through `reason_clause_id`. Todo: comp */
    reason_literals?: number[];
}

export interface ConflictEvent {
    event: "conflict";
    clause_id: number;
    literals: number[];
    level: number;
    trail: number[];
}

export interface LearnEvent {
    event: "learn";
    learned_literals: number[];
    glue: number;
    clause_id: number;
    jump_level: number;
}

export type BacktrackKind = "conflict" | "restart" | "other";

export const backtrackKinds: readonly BacktrackKind[] = [
    "conflict",
    "restart",
    "other",
];

export interface BacktrackEvent {
    event: "backtrack";
    from_level: number;
    to_level: number;
    kind: BacktrackKind;
    reason?: string;
}

export interface RestartEvent {
    event: "restart";
    count: number;
}

export interface DeleteClauseEvent {
    event: "delete_clause";
    clause_id: number;
    literals: number[];
}

export type InspectOutcome = "satisfied" | "unit" | "falsified" | "unresolved";

export const inspectOutcomes: readonly InspectOutcome[] = [
    "satisfied",
    "unit",
    "falsified",
    "unresolved",
];

export interface InspectEvent {
    event: "inspect";
    clause_id: number;
    outcome: InspectOutcome;
    watched?: [number, number];
    next_watched?: [number, number];
}

export interface ResultEvent {
    event: "result";
    result: "sat" | "unsat" | "unknown";
    model: number[];
}

export type SolverEvent =
    | InitEvent
    | DecideEvent
    | PropagateEvent
    | ConflictEvent
    | LearnEvent
    | BacktrackEvent
    | RestartEvent
    | DeleteClauseEvent
    | InspectEvent
    | ResultEvent;

export type EventKind = SolverEvent["event"];
export type EventOf<K extends EventKind> = Extract<SolverEvent, { event: K }>;

type Check = (v: unknown) => boolean;

const num: Check = (v) => typeof v === "number" && Number.isFinite(v);
const str: Check = (v) => typeof v === "string";
const numOrNull: Check = (v) => v === null || num(v);
const nums: Check = (v) => Array.isArray(v) && v.every(num);
const clauses: Check = (v) =>
    Array.isArray(v) &&
    v.every(
        (c) =>
            typeof c === "object" &&
            c !== null &&
            num((c as { id?: unknown }).id) &&
            nums((c as { literals?: unknown }).literals),
    );

const required: Record<EventKind, Record<string, Check>> = {
    init: {
        protocol_version: str,
        variables: num,
        clauses: num,
        variable_ids: nums,
        clause_list: clauses,
    },
    decide: { literal: num, level: num },
    propagate: { literal: num, level: num, reason_clause_id: numOrNull },
    conflict: { clause_id: num, literals: nums, level: num, trail: nums },
    learn: {
        learned_literals: nums,
        glue: num,
        clause_id: num,
        jump_level: num,
    },
    backtrack: { from_level: num, to_level: num, kind: str },
    restart: { count: num },
    delete_clause: { clause_id: num, literals: nums },
    inspect: { clause_id: num, outcome: str },
    result: { result: str, model: nums },
};

/**
 * per event validation of log events. Returns null if the event is valid
 * TODO: make this more performant, it runs in the hot path of parsing, flame chart shows its a bottleneck
 */
export function eventProblem(value: unknown): string | null {
    if (typeof value !== "object" || value === null) {
        return "not a JSON object";
    }

    const record = value as Record<string, unknown>;
    const kind = record.event;

    if (kind === undefined) {
        return "no `event` field";
    }

    if (typeof kind !== "string" || !(kind in required)) {
        return `unknown event kind ${JSON.stringify(kind)}`;
    }

    for (const [field, ok] of Object.entries(required[kind as EventKind])) {
        if (!(field in record)) {
            return `${kind} is missing \`${field}\``;
        }

        if (!ok(record[field])) {
            return `${kind} has an unusable \`${field}\``;
        }
    }

    return null;
}

export function isSolverEvent(value: unknown): value is SolverEvent {
    return eventProblem(value) === null;
}
