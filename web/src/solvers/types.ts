export interface RunRequest {
    wasmModuleUrl: string;
    argv: string[];
    cnf: { path: string; bytes: Uint8Array };
    logPath: string;
    /** Called synchronously from `fd_write` as the solver produces bytes. */
    onChunk: (bytes: Uint8Array) => void;
}

export interface RunResult {
    exitCode: number;
    /** solvers stdout */
    output: string;
}

export interface SolverRuntime {
    run(request: RunRequest): Promise<RunResult>;
}
