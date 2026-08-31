import {
    backtrackKinds,
    eventProblem,
    SUPPORTED_PROTOCOL_VERSION,
    type SolverEvent,
} from "./events";

/**
 * For lines that dont parse as well-formed event.
 */
export class EventLogError extends Error {
    constructor(
        readonly line: number,
        readonly reason: string,
        readonly text: string,
    ) {
        super(`line ${line}: ${reason}`);
        this.name = "EventLogError";
    }
}

/**
 * Incremental NDJSON event parser
 */
export interface EventParser {
    /** Decode a byte array. */
    pushBytes(bytes: Uint8Array): SolverEvent[];
    /** Feed text directly. */
    pushText(text: string): SolverEvent[];
    /** Flush a trailing line that had no newline. */
    finish(): SolverEvent[];

    readonly protocolVersion: string | null;
    readonly done: boolean;
}

export function createEventParser(): EventParser {
    let tail = "";
    let lineNo = 0;
    let protocolVersion: string | null = null;
    let done = false;
    let decoder: TextDecoder | null = null;

    function fail(reason: string, text: string): never {
        throw new EventLogError(lineNo, reason, text.slice(0, 500));
    }

    const consumeLine = (raw: string, out: SolverEvent[]) => {
        lineNo++;

        const line = raw.trim();

        if (line === "") {
            fail("blank line", raw);
        }

        let value: unknown;

        try {
            value = JSON.parse(line);
        } catch {
            fail("invalid JSON", line);
        }

        const problem = eventProblem(value);

        if (problem !== null) {
            fail(problem, line);
        }

        const event = value as SolverEvent;

        if (lineNo === 1) {
            if (event.event !== "init") {
                fail(`log starts with ${event.event}, expected init`, line);
            }

            protocolVersion = event.protocol_version;

            if (protocolVersion !== SUPPORTED_PROTOCOL_VERSION) {
                fail(
                    `protocol version ${JSON.stringify(protocolVersion)},` +
                        ` expected ${JSON.stringify(SUPPORTED_PROTOCOL_VERSION)}`,
                    line,
                );
            }
        } else if (event.event === "init") {
            fail("second init event", line);
        }

        if (
            event.event === "backtrack" &&
            !backtrackKinds.includes(event.kind)
        ) {
            fail(
                `backtrack kind ${JSON.stringify(event.kind)} is not one of ${backtrackKinds.join("/")}`,
                line,
            );
        }

        out.push(event);

        if (event.event === "result") {
            done = true;
        }
    };

    const pushText = (text: string): SolverEvent[] => {
        const out: SolverEvent[] = [];

        if (done) {
            return out;
        }

        let start = 0;

        for (;;) {
            const br = text.indexOf("\n", start);

            if (br === -1) {
                tail += text.slice(start);
                break;
            }

            consumeLine(tail + text.slice(start, br), out);
            tail = "";
            start = br + 1;

            if (done) {
                break;
            }
        }

        return out;
    };

    const pushBytes = (bytes: Uint8Array): SolverEvent[] => {
        if (done) {
            return [];
        }
        decoder ??= new TextDecoder("utf-8");
        return pushText(decoder.decode(bytes, { stream: true }));
    };

    const finish = (): SolverEvent[] => {
        const out: SolverEvent[] = [];

        if (!done && tail !== "") {
            consumeLine(tail, out);
        }

        tail = "";
        return out;
    };

    return {
        pushBytes,
        pushText,
        finish,
        get protocolVersion() {
            return protocolVersion;
        },
        get done() {
            return done;
        },
    };
}
