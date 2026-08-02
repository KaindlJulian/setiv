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
    protocolVersion: number | null;
}

const maxIssues = 50;

export function parseEventLog(text: string): ParseResult {
    const issues: ParseIssue[] = [];
    const events: SolverEvent[] = [];
    let protocolVersion: number | null = null;

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

    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
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

        // ends the run
        if (value.event === "result") {
            break;
        }
    }

    return { events, issues, protocolVersion };
}
