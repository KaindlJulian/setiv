import type { SolverEvent } from "@/model/events";
import type { RunCommand, WorkerMessage } from "./protocol";

export interface RunCallbacks {
    /** A batch of events, in order. This is the event stream */
    onEvents(events: SolverEvent[], bytes: number): void;
    onDone(summary: {
        exitCode: number;
        output: string;
        bytes: number;
        protocolVersion: string | null;
        log: Blob;
    }): void;
    onError(message: string, line?: { number: number; text: string }): void;
}

/**
 * Run a solver on a formula, streaming its event log as it is produced.
 *
 * Aborting the signal terminates the worker.
 */
export function runSolver(
    command: RunCommand,
    callbacks: RunCallbacks,
    abortSignal: AbortSignal,
): void {
    const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
    });

    let settled = false;

    const terminate = () => {
        settled = true;
        worker.terminate();
    };

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        if (settled) {
            return;
        }

        const message = e.data;

        switch (message.type) {
            case "events":
                callbacks.onEvents(message.events, message.bytes);
                break;
            case "done":
                terminate();
                callbacks.onDone(message);
                break;
            case "error":
                terminate();
                callbacks.onError(message.message, message.line);
                break;
        }
    };

    worker.onerror = (e) => {
        if (settled) {
            return;
        }
        terminate();
        callbacks.onError(e.message);
    };

    abortSignal.addEventListener("abort", terminate, { once: true });

    worker.postMessage(command, [command.cnfBytes.buffer]);
}
