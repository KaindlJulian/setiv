export interface SolverInfo {
    id: string;
    name: string;
    algorithm: string;
    decisions: string;
    version: string;
    source: string;
    description: string;
    command: string;
}

export const solvers: SolverInfo[] = [
    {
        id: "cadical",
        name: "CaDiCaL",
        algorithm: "CDCL",
        decisions: "VMTF queue",
        version: "3.0.0",
        source: "https://github.com/arminbiere/cadical",
        description: "Default CaDiCal.",
        command: "cadical formula.cnf",
    },
    {
        id: "cadical-plain",
        name: "CaDiCaL - Plain",
        algorithm: "CDCL",
        decisions: "VMTF queue",
        version: "3.0.0",
        source: "https://github.com/arminbiere/cadical",
        description:
            "CaDiCaL with most optimizations disabled, so a log follows plain CDCL as close as possible.",
        command:
            "cadical --plain --lucky=false --no-otfs --chrono=false" +
            " --no-restartreusetrail --no-stabilize --no-rephase --no-walk" +
            " --shrink=0 formula.cnf",
    },
    {
        id: "setiv-dpll",
        name: "setiv-dpll",
        algorithm: "DPLL",
        decisions: "First unassigned",
        version: "0.1.0",
        source: "solvers/setiv-dpll",
        description: "Simple reference DPLL solver written for this project.",
        command: "setiv-dpll formula.cnf",
    },
];
