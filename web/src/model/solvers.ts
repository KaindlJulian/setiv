/**
 * Information for how to run the solver.
 *
 * `argv` are the flags
 */
export interface WasmSolver {
    runtime: "wasi";
    /** Module filename under `${BASE_URL}/solvers/`. */
    module: string;
    argv(paths: { cnf: string; log: string }): string[];
}

export interface SolverInfo {
    id: string;
    name: string;
    algorithm: string;
    decisions: string;
    version: string;
    source: string;
    description: string;
    wasm: WasmSolver;
}

export function solverDisplayCommand(solver: SolverInfo): string {
    return solver.wasm
        .argv({ cnf: "formula.cnf", log: "events.jsonl" })
        .join(" ");
}

/**
 * `--quiet` and `-n` cut stdout to the one `s SATISFIABLE` line: the banner,
 * option dump and statistics report are `c ` comments nothing here reads.
 * Errors still print, `Internal::error` writes to stderr without consulting
 * `quiet`.
 */
function cadicalArgv(flags: string[]) {
    return ({ cnf, log }: { cnf: string; log: string }) => [
        "cadical",
        "--quiet",
        "-n",
        "--no-colors",
        ...flags,
        "-j",
        log,
        cnf,
    ];
}

export const solvers: SolverInfo[] = [
    {
        id: "cadical-plain",
        name: "CaDiCaL Simple",
        algorithm: "CDCL",
        decisions: "VMTF queue",
        version: "3.0.0",
        source: "https://github.com/arminbiere/cadical",
        description:
            "CaDiCaL with most optimizations disabled. Follows the plain CDCL" +
            " algorithm more closely.",
        wasm: {
            runtime: "wasi",
            module: "cadical.wasm",
            argv: cadicalArgv([
                "--plain",
                "--lucky=false",
                "--no-otfs",
                "--chrono=false",
                "--no-restartreusetrail",
                "--no-stabilize",
                "--no-rephase",
                "--no-walk",
                "--shrink=0",
            ]),
        },
    },
    {
        id: "cadical",
        name: "CaDiCaL (WIP)",
        algorithm: "CDCL",
        decisions: "VMTF queue",
        version: "3.0.0",
        source: "https://github.com/arminbiere/cadical",
        description:
            "WIP: Results can be unexpected right now, there are hook points missing. Specifically, events are not emitted for preprocessing and when clauses are deleted to be added again in another form / with a new id.",
        wasm: {
            runtime: "wasi",
            module: "cadical.wasm",
            argv: cadicalArgv([]),
        },
    },
    {
        id: "setiv-dpll",
        name: "setiv-dpll",
        algorithm: "DPLL",
        decisions: "First unassigned",
        version: "0.1.0",
        source: "solvers/setiv-dpll",
        description: "Simple reference DPLL solver written for this project.",
        wasm: {
            runtime: "wasi",
            module: "setiv-dpll.wasm",
            argv: ({ cnf, log }) => ["setiv-dpll", "--events", log, cnf],
        },
    },
];

export function solverById(id: string): SolverInfo | undefined {
    return solvers.find((s) => s.id === id);
}
