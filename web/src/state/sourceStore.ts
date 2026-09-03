import type { SolverEvent } from "@/model/events";
import { createEventParser, EventLogError } from "@/model/parseStream";
import { createRunBuilder, type SolverRun } from "@/model/run";
import { runSolver } from "@/solvers/runSolver";
import { batch, signal, type ReadonlySignal } from "@preact/signals";

export type SourceStatus = "idle" | "reading" | "solving";

export interface LoadError {
    message: string;
    line?: { number: number; text: string };
}

export interface SourceStore {
    /** holds all the parsed and derived data, central source */
    run: ReadonlySignal<SolverRun | null>;
    fileName: ReadonlySignal<string>;
    loadError: ReadonlySignal<LoadError | null>;

    status: ReadonlySignal<SourceStatus>;
    bytesRead: ReadonlySignal<number>;
    /** The generated log blob */
    generatedLog: ReadonlySignal<Blob | null>;

    /** Read an event log from a file */
    loadLogFile(file: File): Promise<void>;
    /** Read an event log from string */
    loadLog(text: string, name: string): void;
    /** Run a solver on a formula and stream its log in as it is generated */
    loadFormula(file: File, solverId: string, flags: string[]): Promise<void>;
    /** Terminate a running solver. Keep the partial log in store */
    terminateSolver(): void;
    setLoadError(message: string, name?: string): void;
}

// How often the view is refreshed / a snapshot is built
const refreshMs = 150;

/**
 * Abort reason for a load that a newer load replaced. The old load then leaves
 * the store alone instead of publishing over what the new one already wrote.
 */
const superseded = Symbol("superseded");

export function createSourceStore(): SourceStore {
    const fileName = signal("");
    const run = signal<SolverRun | null>(null);
    const loadError = signal<LoadError | null>(null);
    const status = signal<SourceStatus>("idle");
    const bytesRead = signal(0);
    const generatedLog = signal<Blob | null>(null);

    let current: AbortController | null = null;

    /** Stop whatever is loading right now and take ownership of the store. */
    const claim = (): AbortSignal => {
        current?.abort(superseded);
        current = new AbortController();
        return current.signal;
    };

    const reset = (name: string, nextStatus: SourceStatus) => {
        batch(() => {
            fileName.value = name;
            run.value = null;
            loadError.value = null;
            status.value = nextStatus;
            bytesRead.value = 0;
            generatedLog.value = null;
        });
    };

    const fail = (name: string, error: LoadError) => {
        current = null;
        batch(() => {
            fileName.value = name;
            run.value = null;
            loadError.value = error;
            status.value = "idle";
        });
    };

    const setLoadError = (message: string, name = "") => {
        fail(name, { message });
    };

    /** Report a rejected log, naming the line when the parser blamed one. */
    const failParse = (name: string, err: unknown, prefix: string) => {
        if (!(err instanceof EventLogError)) {
            setLoadError(`Could not read ${name}: ${err}`, name);
            return;
        }

        fail(name, {
            message: `${prefix} ${err.message}`,
            line: { number: err.line, text: err.text },
        });
    };

    /**
     * Manages loading a stream of events.
     *
     * event batch in, snapshot out.
     */
    const createSink = () => {
        const builder = createRunBuilder();
        let lastPublish = 0;

        return {
            accept: (events: readonly SolverEvent[], bytes: number) => {
                builder.append(events);
                bytesRead.value = bytes;

                if (builder.eventCount === 0) {
                    return;
                }

                if (performance.now() - lastPublish >= refreshMs) {
                    lastPublish = performance.now();
                    run.value = builder.snapshot();
                }
            },

            finish: () => {
                current = null;
                batch(() => {
                    run.value = builder.snapshot();
                    status.value = "idle";
                });
            },
        };
    };

    const loadLogFile = async (file: File) => {
        const abort = claim();

        reset(file.name, "reading");

        const parser = createEventParser();
        const sink = createSink();
        const reader = file.stream().getReader();

        let bytes = 0;

        try {
            for (;;) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                if (abort.aborted) {
                    await reader.cancel();

                    // a newer load owns the store now, leave it alone
                    if (abort.reason !== superseded) {
                        sink.finish();
                    }
                    return;
                }

                bytes += value.byteLength;
                sink.accept(parser.pushBytes(value), bytes);

                if (parser.done) {
                    await reader.cancel();
                    break;
                }
            }

            sink.accept(parser.finish(), bytes);

            if (parser.protocolVersion === null) {
                setLoadError(`"${file.name}" is empty.`, file.name);
                return;
            }

            sink.finish();
        } catch (err) {
            await reader.cancel().catch(() => {});

            if (abort.reason === superseded) {
                return;
            }

            failParse(
                file.name,
                err,
                `"${file.name}" is not a valid event log.`,
            );
        }
    };

    const loadLog = (text: string, name: string) => {
        claim();

        reset(name, "reading");

        const parser = createEventParser();
        const sink = createSink();

        try {
            sink.accept(parser.pushText(text), text.length);
            sink.accept(parser.finish(), text.length);

            if (parser.protocolVersion === null) {
                setLoadError(`"${name}" is empty.`, name);
                return;
            }

            sink.finish();
        } catch (err) {
            failParse(name, err, `"${name}" is not a valid event log.`);
        }
    };

    const loadFormula = async (
        file: File,
        solverId: string,
        flags: string[],
    ) => {
        const dimacsText = await file.text();
        const abort = claim();

        reset(file.name, "solving");

        const sink = createSink();

        await new Promise<void>((resolve) => {
            let settled = false;

            abort.addEventListener(
                "abort",
                () => {
                    if (settled) {
                        return;
                    }

                    // stopped by the user, publish what the solver got to
                    if (abort.reason !== superseded) {
                        sink.finish();
                    }

                    settled = true;
                    resolve();
                },
                { once: true },
            );

            runSolver(
                {
                    solverId,
                    flags,
                    cnfName: file.name,
                    cnfBytes: new TextEncoder().encode(dimacsText),
                },
                {
                    // events stream in here
                    onEvents(events, bytes) {
                        sink.accept(events, bytes);
                    },

                    onDone({ output, protocolVersion, log }) {
                        settled = true;

                        if (protocolVersion === null) {
                            setLoadError(
                                `${solverId} produced no events for ${file.name}.` +
                                    (output ? ` ${output.trim()}` : ""),
                                file.name,
                            );
                            resolve();
                            return;
                        }
                        generatedLog.value = log;
                        sink.finish();
                        resolve();
                    },

                    onError(message, line) {
                        settled = true;
                        fail(file.name, {
                            message: line
                                ? `${solverId} produced an invalid event log. ${message}`
                                : `${solverId} failed on ${file.name}: ${message}`,
                            line,
                        });
                        resolve();
                    },
                },
                abort,
            );
        });
    };

    const cancel = () => {
        current?.abort();
        current = null;
    };

    return {
        run,
        fileName,
        loadError,
        status,
        bytesRead,
        generatedLog,
        loadLogFile,
        loadLog,
        loadFormula,
        terminateSolver: cancel,
        setLoadError,
    };
}
