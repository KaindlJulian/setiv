import { backtrackKinds, isSolverEvent, type SolverEvent } from "./events";

export interface ParseIssue {
    /** 1-based line number in the log file */
    line: number;
    reason: string;
    text: string;
}

export interface ParseResult {
    events: SolverEvent[];
    issues: ParseIssue[];
    protocolVersion: String | null;
}

export const maxIssues = 50;

export function parseEventLog(text: string): ParseResult {
    const issues: ParseIssue[] = [];
    const events: SolverEvent[] = [];
    let protocolVersion: String | null = null;

    const addIssue = (line: number, reason: string, text: string) => {
        if (issues.length >= maxIssues) {
            return;
        }

        issues.push({
            line,
            reason,
            text,
        });
    };

    for (let start = 0, i = 0; start <= text.length; i++) {
        const br = text.indexOf("\n", start);
        const end = br === -1 ? text.length : br;
        const line = text.slice(start, end).trim();

        start = end + 1;

        let value: unknown;

        if (line === "") {
            continue;
        }

        try {
            value = JSON.parse(line);
        } catch {
            addIssue(i + 1, "invalid JSON", line);
            continue;
        }

        if (!isSolverEvent(value)) {
            const kind = (value as { event?: unknown } | null)?.event;
            addIssue(
                i + 1,
                kind === undefined
                    ? "no `event` field"
                    : `unknown event kind ${JSON.stringify(kind)}`,
                line,
            );
            continue;
        }

        if (value.event === "init") {
            protocolVersion = value.protocol_version;
        }

        if (
            value.event === "backtrack" &&
            !backtrackKinds.includes(value.kind)
        ) {
            addIssue(
                i + 1,
                `backtrack kind ${JSON.stringify(value.kind)} is not one of ${backtrackKinds.join("/")}`,
                line,
            );
            value.kind = "other";
        }

        events.push(value);

        if (value.event === "result") {
            break;
        }
    }

    return { events, issues, protocolVersion };
}
