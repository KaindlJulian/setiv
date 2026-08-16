import { SUPPORTED_PROTOCOL_VERSION } from "@/model/events";
import { parseEventLog, type ParseIssue } from "@/model/parse";
import { buildRun, type SolverRun } from "@/model/run";
import { batch, signal, type ReadonlySignal } from "@preact/signals";

export interface SourceStore {
    /** holds all the parsed and derived data, source of truth */
    run: ReadonlySignal<SolverRun | null>;
    fileName: ReadonlySignal<string>;
    parseIssues: ReadonlySignal<ParseIssue[]>;
    loadError: ReadonlySignal<string | null>;

    loadLog(text: string, name: string): void;
    setLoadError(message: string, name?: string): void;
}

export function createSourceStore(): SourceStore {
    const fileName = signal("");
    const run = signal<SolverRun | null>(null);
    const parseIssues = signal<ParseIssue[]>([]);
    const loadError = signal<string | null>(null);

    const loadLog = (text: string, name: string) => {
        const { events, issues, protocolVersion } = parseEventLog(text);

        let rejection = "";

        if (protocolVersion !== SUPPORTED_PROTOCOL_VERSION) {
            rejection += `"${name}" has wrong protocol version "${protocolVersion}". (Use version >=${SUPPORTED_PROTOCOL_VERSION})`;
        }

        if (rejection) {
            batch(() => {
                fileName.value = name;
                run.value = null;
                parseIssues.value = issues;
                loadError.value = rejection;
            });
            return;
        }

        batch(() => {
            fileName.value = name;
            run.value = buildRun(events);
            parseIssues.value = issues;
            loadError.value = null;
        });
    };

    const setLoadError = (message: string, name = "") => {
        batch(() => {
            fileName.value = name;
            run.value = null;
            parseIssues.value = [];
            loadError.value = message;
        });
    };

    return {
        run,
        fileName,
        parseIssues,
        loadError,
        loadLog,
        setLoadError,
    };
}
