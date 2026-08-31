/**
 * Information for how to run the solver.
 *
 * `argv` are the flags
 */
export interface WasmSolver {
    runtime: "wasi" | "emscripten";
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
    command: string;
    wasm: WasmSolver;
}

export const solvers: SolverInfo[] = [
    {
        id: "setiv-dpll",
        name: "setiv-dpll",
        algorithm: "DPLL",
        decisions: "First unassigned",
        version: "0.1.0",
        source: "solvers/setiv-dpll",
        description: "Simple reference DPLL solver written for this project.",
        command: "setiv-dpll formula.cnf",
        wasm: {
            runtime: "wasi",
            module: "setiv-dpll.wasm",
            argv: ({ cnf, log }) => ["setiv-dpll", "--events", log, cnf],
        },
    },
    {
        id: "cadical",
        name: "[WIP] CaDiCaL",
        algorithm: "CDCL",
        decisions: "VMTF queue",
        version: "3.0.0",
        source: "https://github.com/arminbiere/cadical",
        description: "Default CaDiCal.",
        command: "cadical formula.cnf",
        wasm: {
            runtime: "emscripten",
            module: "",
            argv: () => ["", "", "", ""],
        },
    },
    {
        id: "cadical-plain",
        name: "[WIP] CaDiCaL Simple",
        algorithm: "CDCL",
        decisions: "VMTF queue",
        version: "3.0.0",
        source: "https://github.com/arminbiere/cadical",
        description:
            "CaDiCaL with most optimizations disabled. Should follow the plain CDCL algorithm more closely.",
        command:
            "cadical --plain --lucky=false --no-otfs --chrono=false" +
            " --no-restartreusetrail --no-stabilize --no-rephase --no-walk" +
            " --shrink=0 formula.cnf",
        wasm: {
            runtime: "emscripten",
            module: "",
            argv: () => ["", "", "", ""],
        },
    },
];

export function solverById(id: string): SolverInfo | undefined {
    return solvers.find((s) => s.id === id);
}
