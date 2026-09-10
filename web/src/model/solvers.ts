import cadicalWasm from "@/solvers/wasm/cadical.wasm?url";
import setivDpllWasm from "@/solvers/wasm/setiv-dpll.wasm?url";

/** Paths the runtime hands the solver on argv. */
export interface SolverPaths {
    cnf: string;
    log: string;
}

/**
 * Information for how to run the solver.
 */
export interface WasmSolver {
    runtime: "wasi";
    moduleUrl: string;
    defaultFlags: string[];
    /** flag to also log inspect events, leave empty if not supported */
    bcpFlag: string;
    argv(flags: string[], paths: SolverPaths): string[];
}

export interface SolverInfo {
    id: string;
    name: string;
    version: string;
    wasm: WasmSolver;
}

// todo check how problematic it really is to let the user put arbitrary flags. since its all client side an a browser wasm sandbox its no big deal, but theoretically this poses an injection threat
export const solvers: SolverInfo[] = [
    {
        id: "cadical",
        name: "CaDiCaL",
        version: "3.0.0",
        wasm: {
            runtime: "wasi",
            moduleUrl: cadicalWasm,
            /**
             * Most optimizations off, so the trace follows the plain CDCL
             * algorithm closely. Drop these to see what CaDiCaL actually does.
             */
            defaultFlags: [
                "--plain",
                "--no-otfs",
                "--no-restartreusetrail",
                "--no-stabilize",
                "--no-rephase",
                "--no-walk",
                "--lucky=false",
                "--chrono=0",
                "--shrink=0",
            ],
            bcpFlag: "--eventlog=2",
            argv: (flags: string[], { cnf, log }: SolverPaths) => {
                return [
                    "cadical",
                    "--quiet",
                    "-n",
                    "--no-colors",
                    ...flags,
                    "-j",
                    log,
                    cnf,
                ];
            },
        },
    },
    {
        id: "setiv-dpll",
        name: "setiv-dpll",
        version: "0.1.0",
        wasm: {
            runtime: "wasi",
            moduleUrl: setivDpllWasm,
            defaultFlags: [],
            bcpFlag: "--log-level=2",
            argv: (flags, { cnf, log }) => [
                "setiv-dpll",
                "--events",
                log,
                ...flags,
                cnf,
            ],
        },
    },
];

export function solverById(id: string): SolverInfo | undefined {
    return solvers.find((s) => s.id === id);
}
