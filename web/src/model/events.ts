export const SUPPORTED_PROTOCOL_VERSION = "2";

export interface ClauseListEntry {
    id: number;
    literals: number[];
}

export interface InitEvent {
    event: "init";
    protocol_version: String;
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
    reason_literals: number[];
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
    | ResultEvent;

export type EventKind = SolverEvent["event"];
export type EventOf<K extends EventKind> = Extract<SolverEvent, { event: K }>;

const eventKinds: readonly string[] = [
    "init",
    "decide",
    "propagate",
    "conflict",
    "learn",
    "backtrack",
    "restart",
    "delete_clause",
    "result",
];

export function isSolverEvent(value: unknown): value is SolverEvent {
    return (
        typeof value === "object" &&
        value !== null &&
        eventKinds.includes((value as any).event)
    );
}
