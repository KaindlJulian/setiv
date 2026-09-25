import type { ComponentChildren } from "preact";

const repoUrl = "https://github.com/kaindljulian/setiv";

interface Credit {
    name: string;
    url: string;
    note?: string;
}

const wasmSolvers: Credit[] = [
    {
        name: "CaDiCaL",
        url: "https://github.com/arminbiere/cadical",
        note: "Patched CaDiCaL with event protocol hooks",
    },
    {
        name: "MiniSat",
        url: "https://github.com/niklasso/minisat",
        note: "Patched minisat with event protocol hooks, only /core",
    },
    {
        name: "Satch",
        url: "https://github.com/arminbiere/satch",
        note: "Patched satch with event protocol hooks, built for CDCL and also with '--no-cdcl' for pure DPLL",
    },
    {
        name: "satotz",
        url: "https://github.com/kaindljulian/satotz",
        note: "A simple CDCL implementation",
    },
    {
        name: "setiv-dpll",
        url: "https://github.com/KaindlJulian/setiv/tree/master/solvers/setiv-dpll",
        note: "A simple DPLL implementation",
    },
];

const relatedWork: Credit[] = [
    {
        name: "Sat-IT",
        url: "https://github.com/udg-lai/sat-it",
        note: "another interactive CDCL tracer, a point of comparison while shaping this project's UI",
    },
    {
        name: "DPvis",
        url: "https://www.carstensinz.de/papers/SAT-2005.pdf",
        note: "Sinz, 2005, the search tree visualization here follows its layout ideas",
    },
];

const usageDescriptions: { title: string; body: string }[] = [
    {
        title: "Event Log Statistics",
        body: "Counters for the run in total: events, clauses, conflicts, etc. Download the event log as .jsonl/.ndjson.",
    },
    {
        title: "Trail",
        body: "Every assigned literal in assignment order, with its decision level and reason clause.",
    },
    {
        title: "Clause database",
        body: "Original, learned, and deleted clauses.",
    },
    {
        title: "Implication graph",
        body: "The decisions and unit propagations that build up to the conflict. Literals as nodes and implications as edges.",
    },
    {
        title: "Decision tree",
        body: "The search tree across the whole run. One path per decision level, branching at each decision and collapsing on backtrack.",
    },
    {
        title: "Formula view",
        body: 'A CNF formula built from the event log init event. One clause per line or as "flowing text".',
    },
    {
        title: "BCP view",
        body: "If BCP level logging solver option is enabled. Shows the individual clause inspections during BCP and watched literals.",
    },
    {
        title: "Event log",
        body: "The raw ndjson solver event log.",
    },
    {
        title: "Conflict selector dropdown",
        body: "Jump directly to a specific conflict",
    },
    {
        title: "Step bar",
        body: "Step through the solver run.",
    },
];

export function AboutPage() {
    return (
        <main class="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div class="mx-auto flex max-w-3xl flex-col gap-8 p-6 pb-16 text-sm leading-relaxed">
                <header>
                    <h1 class="text-2xl font-bold">About</h1>
                </header>

                <Section title="Background">
                    <p>
                        A SAT solver decides whether a CNF formula has a
                        satisfying assignment. Modern solvers use CDCL. Pick a
                        literal, propagate what that forces, and when
                        propagation runs into a conflict, walk the implication
                        graph to learn a clause that rules out the cause, then
                        backtrack. <br />
                        This tool visualizes such a solver search step by step,
                        and allows to jump to any conflict and see the trail,
                        the clause database, the implication graph, and the
                        decision tree as they stood at that point.
                    </p>
                </Section>

                <Section title="This project">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="border-base-300 bg-base-100 rounded-box border p-4">
                            <h3 class="mb-2 font-semibold">Event protocol</h3>
                            <p>
                                An NDJSON stream of the events a search
                                produces, specified without reference to any
                                specific solver's internals. A solver implements
                                the protocol by emitting these events as it
                                runs. See the{" "}
                                <a
                                    href={`${repoUrl}/blob/master/event_protocol/solver_event_protocol.md`}
                                    target="_blank"
                                    rel="noreferrer"
                                    class="link"
                                >
                                    spec
                                </a>{" "}
                                and the{" "}
                                <a
                                    href={`${repoUrl}/blob/master/event_protocol/json_schemas/solver_event_schema.json`}
                                    target="_blank"
                                    rel="noreferrer"
                                    class="link"
                                >
                                    JSON schema
                                </a>
                                .
                            </p>
                        </div>
                        <div class="border-base-300 bg-base-100 rounded-box border p-4">
                            <h3 class="mb-2 font-semibold">Web-based viewer</h3>
                            <p>
                                The webapp reads an event log and replays it to
                                create visualizations. At any step we can
                                inspect the trail, the clause database, the
                                implication graph, and the decision tree.
                            </p>
                            <a class="link" href="/">
                                Load an example
                            </a>
                        </div>
                    </div>
                </Section>

                <Section title="Usage">
                    <img
                        src="main_screen.png"
                        alt="Screenshot of the viewer"
                        class="border-base-300 mb-3 rounded-lg border"
                    />
                    <ol class="flex flex-col gap-3">
                        {usageDescriptions.map((el, i) => (
                            <li key={el.title} class="flex gap-3">
                                <span class="badge badge-neutral badge-sm mt-0.5 shrink-0 font-mono">
                                    {i + 1}
                                </span>
                                <span>
                                    <strong>{el.title}</strong>: {el.body}
                                </span>
                            </li>
                        ))}
                    </ol>
                </Section>

                <Section title="Keybinds">
                    <table class="w-auto border-separate border-spacing-y-2">
                        <tbody>
                            <Keybind
                                keys={["→"]}
                                action="Step forward one event"
                            />
                            <Keybind
                                keys={["←"]}
                                action="Step back one event"
                            />
                            <Keybind
                                keys={["Ctrl", "→"]}
                                action="Jump to the next conflict"
                            />
                            <Keybind
                                keys={["Ctrl", "←"]}
                                action="Jump to the previous conflict"
                            />
                        </tbody>
                    </table>
                </Section>

                <Section title="Solvers">
                    <CreditList items={wasmSolvers} />
                </Section>

                <Section title="Related">
                    <CreditList items={relatedWork} />
                </Section>

                <footer class="border-base-300 text-base-content/50 border-t pt-4 text-xs">
                    <a
                        href={repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        class="link"
                    >
                        Source on GitHub
                    </a>
                </footer>
            </div>
        </main>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: ComponentChildren;
}) {
    return (
        <section>
            <h2 class="border-base-300 mb-3 border-b pb-1 text-base font-semibold">
                {title}
            </h2>
            {children}
        </section>
    );
}

function CreditList({ items }: { items: Credit[] }) {
    return (
        <ul class="flex list-disc flex-col gap-1.5 pl-5">
            {items.map((c) => (
                <li key={c.name}>
                    {c.url ? (
                        <a
                            href={c.url}
                            target="_blank"
                            rel="noreferrer"
                            class="link font-medium"
                        >
                            {c.name}
                        </a>
                    ) : (
                        <span class="font-medium">{c.name}</span>
                    )}
                    {c.note && (
                        <span class="text-base-content/60"> {c.note}</span>
                    )}
                </li>
            ))}
        </ul>
    );
}

function Keybind({ keys, action }: { keys: string[]; action: string }) {
    return (
        <tr>
            <td class="pr-4 align-top whitespace-nowrap">
                {keys.map((k, i) => (
                    <span key={k}>
                        {i > 0 && <span class="mx-1">+</span>}
                        <kbd class="kbd kbd-sm">{k}</kbd>
                    </span>
                ))}
            </td>
            <td class="text-base-content/80 align-top">{action}</td>
        </tr>
    );
}
