/// <reference lib="webworker" />
import type { SolverEvent } from "@/model/events";
import { createEventParser, EventLogError } from "@/model/parseStream";
import { solverById } from "@/model/solvers";
import { createLogStore } from "./logStore";
import type { RunCommand, WorkerMessage } from "./protocol";
import { wasiPaths, wasiRuntime } from "./runtimes/wasi";

/**
 * Batching thresholds for the worker to js
 *
 * The solver runs to completion inside one synchronous call, so these bound how
 * much the main thread waits between updates, not how much work happens here.
 */

//todo: kinda arbitrary, check whats optimal
const batchEvents = 50_000;
const batchMs = 50;

function post(message: WorkerMessage, transfer: Transferable[] = []) {
    (self as DedicatedWorkerGlobalScope).postMessage(message, transfer);
}

self.onmessage = async (e: MessageEvent<RunCommand>) => {
    try {
        await run(e.data);
    } catch (err) {
        // Thrown at the first line that is not a well formatted event
        if (err instanceof EventLogError) {
            post({
                type: "error",
                message: err.message,
                line: { number: err.line, text: err.text },
            });
            return;
        }

        post({ type: "error", message: String(err) });
    }
};

async function run({ solverId, flags, cnfName, cnfBytes }: RunCommand) {
    const solver = solverById(solverId);

    if (!solver?.wasm) {
        throw new Error(`solver "${solverId}" has no wasm build`);
    }

    const paths = wasiPaths(cnfName, solverId);
    const argv = solver.wasm.argv(flags, paths);
    const entry = `${import.meta.env.BASE_URL}solvers/${solver.wasm.module}`;

    const store = await createLogStore(`${solverId}-${cnfName}.jsonl`);
    const parser = createEventParser();

    let pending: SolverEvent[] = [];
    let bytes = 0;
    let lastPost = performance.now();

    const flush = () => {
        lastPost = performance.now();

        if (pending.length === 0) {
            return;
        }

        post({ type: "events", events: pending, bytes });
        pending = [];
    };

    const { exitCode, output } = await wasiRuntime.run({
        wasmModuleUrl: entry,
        argv,
        cnf: { path: paths.cnf, bytes: cnfBytes },
        logPath: paths.log,
        onChunk: (chunk) => {
            bytes += chunk.byteLength;
            store.write(chunk);

            const events = parser.pushBytes(chunk);

            if (events.length > 0) {
                for (const event of events) {
                    pending.push(event);
                }
            }

            if (
                pending.length >= batchEvents ||
                performance.now() - lastPost >= batchMs
            ) {
                flush();
            }
        },
    });

    if (exitCode !== 0 && parser.protocolVersion === null) {
        await store.discard();
        post({
            type: "error",
            message: output.trimEnd() || `exited with code ${exitCode}`,
        });
        return;
    }

    for (const event of parser.finish()) {
        pending.push(event);
    }

    if (pending.length > 0) {
        flush();
    }

    post({
        type: "done",
        exitCode,
        output,
        bytes,
        protocolVersion: parser.protocolVersion,
        log: await store.finish(),
    });
}
