import { batch, signal, type ReadonlySignal } from "@preact/signals";
import { SUPPORTED_PROTOCOL_VERSION } from "../model/events";
import { parseEventLog, type ParseIssue } from "../model/parse";
import { buildRun, type SolverRun } from "../model/run";

/**
 * Where the data comes from: raw log text in, a `SolverRun` plus diagnostics
 * out. Owns nothing about how the run is then viewed.
 */
export interface SourceStore {
    /** holds all the parsed data, source of truth */
    run: ReadonlySignal<SolverRun | null>;
    fileName: ReadonlySignal<string>;
    rawText: ReadonlySignal<string>;
    parseIssues: ReadonlySignal<ParseIssue[]>;
    loadError: ReadonlySignal<string | null>;

    loadLog(text: string, name: string): void;
    setLoadError(message: string, name?: string): void;
}

export function createSourceStore(): SourceStore {
    const fileName = signal("");
    const rawText = signal("");
    const run = signal<SolverRun | null>(null);
    const parseIssues = signal<ParseIssue[]>([]);
    const loadError = signal<string | null>(null);

    const loadLog = (text: string, name: string) => {
        const { events, issues, protocolVersion } = parseEventLog(text);

        let rejection = "";

        if (protocolVersion !== SUPPORTED_PROTOCOL_VERSION) {
            rejection += `Unsupported protocol version "${protocolVersion}". (supported version '${SUPPORTED_PROTOCOL_VERSION}')`;
        }

        if (rejection) {
            batch(() => {
                fileName.value = name;
                rawText.value = text;
                run.value = null;
                parseIssues.value = issues;
                loadError.value = rejection;
            });
            return;
        }

        batch(() => {
            fileName.value = name;
            rawText.value = text;
            run.value = buildRun(events);
            parseIssues.value = issues;
            loadError.value = null;
        });
    };

    const setLoadError = (message: string, name = "") => {
        batch(() => {
            fileName.value = name;
            rawText.value = "";
            run.value = null;
            parseIssues.value = [];
            loadError.value = message;
        });
    };

    return {
        run,
        fileName,
        rawText,
        parseIssues,
        loadError,
        loadLog,
        setLoadError,
    };
}
