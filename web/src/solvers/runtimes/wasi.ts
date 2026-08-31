import type { RunResult, SolverRuntime } from "../types";
import { createWasi, type WasiFile } from "../wasiShim";

const workDir = "setiv";

/** Paths the runtime hands the solver on argv. */
export function wasiPaths(cnfName: string, solverName: string) {
    return {
        cnf: `/${workDir}/${cnfName}`,
        log: `/${workDir}/${cnfName}_${solverName}_events.jsonl`,
    };
}

/**
 * Runs a `wasm32-wasip1` solver.
 */
export const wasiRuntime: SolverRuntime = {
    async run({
        wasmModuleUrl,
        argv,
        cnf,
        logPath,
        onChunk,
    }): Promise<RunResult> {
        let output = "";
        const decoder = new TextDecoder();

        const files = new Map<string, WasiFile>([
            [basename(cnf.path), { bytes: cnf.bytes }],
            [basename(logPath), { onWrite: onChunk }],
        ]);

        const wasi = createWasi({
            args: argv,
            dir: `/${workDir}`,
            files,
            onOutput: (bytes) => {
                output += decoder.decode(bytes, { stream: true });
            },
        });

        const module = await WebAssembly.compileStreaming(fetch(wasmModuleUrl));
        const instance = await WebAssembly.instantiate(module, wasi.imports);

        return { exitCode: wasi.start(instance), output };
    },
};

function basename(path: string): string {
    return path.slice(path.lastIndexOf("/") + 1);
}
