import type { ComponentChildren } from "preact";

const repoUrl = "https://github.com/KaindlJulian/setiv";

interface Credit {
    name: string;
    url: string;
    note?: string;
}

const wasmSolvers: Credit[] = [
    {
        name: "CaDiCaL",
        url: "https://github.com/arminbiere/cadical",
        note: "we patched cadical with event protocol hooks",
    },
    {
        name: "Satch",
        url: "https://github.com/arminbiere/satch",
        note: "we patched satch with event protocol hooks, built once as plain CDCL and once with '--no-cdcl' as pure DPLL",
    },
    {
        name: "setiv-dpll",
        url: "",
        note: "this project's own reference DPLL implementation",
    },
];

const referenceSolvers: Credit[] = [
    { name: "Kissat", url: "https://github.com/arminbiere/kissat" },
    { name: "Glucose", url: "https://github.com/audemard/glucose" },
    { name: "MiniSat", url: "https://github.com/niklasso/minisat" },
    { name: "MapleSAT", url: "https://github.com/curtisbright/maplesat" },
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
        title: "Run status",
        body: "Idle, running, or aborted state of the solver.",
    },
    {
        title: "Open menu",
        body: "Load a run. Either a CNF formula plus a solver to run it live as WASM, a pre-recorded .jsonl/.ndjson event log.",
    },
    {
        title: "Event Log Statistics",
        body: "Counters for the run. Total number of events, clauses, conflicts, etc.",
    },
    {
        title: "Trail",
        body: "The current assignment trail. Every assigned literal in order, its decision level, and whether it was a decision or a propagation, with the reason clause.",
    },
    {
        title: "Clause database",
        body: "Original, learned, and deleted clauses. Showing only the clauses alive in the respective category at the cursors step with color coded literals.",
    },
    {
        title: "Implication graph",
        body: "The graph of decisions and unit propagations building up to the conflict at the current decision level: nodes are assigned literals, edges are implications labeled with their reason clause. Hover a node or edge for details, click an edge's clause to reveal it in the sidebar.",
    },
    {
        title: "Decision tree",
        body: "The search tree across the whole run: one path per decision level, branching at each decision, collapsing on backtrack. Conflicts and restarts are marked on the path that produced them.",
    },
    {
        title: "Formula view",
        body: "The static CNF formula from the log's init event, rendered either one clause per line or as continuous flowing text. Each clause and literal colored by its current status (satisfied, falsified, unit, open) under the assignment at the cursor.",
    },
    {
        title: "Event log",
        body: "The raw underlying event stream, one row per event, scrollable and searchable, with the cursor's current event highlighted.",
    },
    {
        title: "Conflict selector",
        body: "Jump directly to a specific conflict by index.",
    },
    {
        title: "Step bar",
        body: "Scrub through the run. Navigation buttons and the range slider move the cursor by one event or jump to the previous/next conflict.",
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
                        A SAT solver decides whether a given propositional
                        formula in conjunctive normal form has a satisfying
                        assignment. Modern solvers utilize CDCL: decide a
                        literal, propagate its consequences, and on conflict
                        analyze the implication graph to learn a new clause and
                        backtrack. Repeated over the run, this produces a search
                        tree of decisions and a growing clause database.
                    </p>
                </Section>

                <Section title="This project">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="border-base-300 bg-base-100 rounded-box border p-4">
                            <h3 class="mb-2 font-semibold">Event protocol</h3>
                            <p>
                                A solver agnostic NDJSON stream of the events
                                that make up a CDCL search, specified
                                independently of any particular solver's
                                implementation. A solver then implements this by
                                emitting the specified json events. See the{" "}
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
                                The webapp depends on the specification of the
                                protocol and replays a log of events step by
                                step. Reconstructing and visualizing the
                                implication graph, the decision tree, the clause
                                database, and the trail at every point in the
                                event stream.
                            </p>
                        </div>
                    </div>
                </Section>

                <Section title="Usage">
                    <p class="text-base-content/70 mb-3">Todo: screenshot</p>
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
                    <p class="text-base-content/70 mb-3">
                        Two solvers implement the protocol and run directly in
                        the browser as WebAssembly:
                    </p>
                    <CreditList items={wasmSolvers} />
                    <p class="text-base-content/70 mt-4 mb-3">
                        For the following we did not implement the protocol, but
                        each halped to shape the protocol's design
                    </p>
                    <CreditList items={referenceSolvers} />
                </Section>

                <Section title="Related work">
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
