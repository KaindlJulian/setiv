import { selectedSolver } from "@/state/solverSelection";

export function SolverCard() {
    const solver = selectedSolver.value;

    return (
        <div
            id="solver-info"
            role="tooltip"
            class="border-base-300 bg-base-100 rounded-box relative flex flex-col gap-2 border p-3 text-xs shadow-lg"
        >
            <div class="border-base-300 bg-base-100 absolute top-4 -left-1.5 hidden size-3 rotate-45 border-b border-l min-[1120px]:block" />

            <div class="flex items-baseline justify-between gap-2">
                <span class="text-sm font-medium">{solver.name}</span>
                <span class="text-base-content/50 font-mono">
                    {solver.version}
                </span>
            </div>

            <dl class="grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1">
                <dt class="text-base-content/60">Algorithm</dt>
                <dd>{solver.algorithm}</dd>

                <dt class="text-base-content/60">Decisions</dt>
                <dd>{solver.decisions}</dd>

                <dt class="text-base-content/60">Source</dt>
                <dd class="min-w-0">
                    {solver.source.startsWith("http") ? (
                        <a
                            href={solver.source}
                            target="_blank"
                            rel="noreferrer"
                            class="link break-all"
                        >
                            {solver.source.replace("https://", "")}
                        </a>
                    ) : (
                        <span class="font-mono break-all">{solver.source}</span>
                    )}
                </dd>
            </dl>

            <p class="text-base-content/80">{solver.description}</p>

            <pre class="border-base-300 bg-base-200 rounded border p-2 font-mono break-words whitespace-pre-wrap">
                {solver.command}
            </pre>
        </div>
    );
}
