import { ClauseChips } from "@/components/ClauseChips";
import { cn } from "@/lib/cn";
import { clauseRef } from "@/lib/format";
import type { DecideEvent } from "@/model/events";
import type { ImplicationNode } from "@/model/implicationGraph";
import type { Value } from "@/model/trail";
import { useSource } from "@/state/context";
import { assignmentText, kindOf } from "@/view/implicationNode";

interface Props {
    node: ImplicationNode;
    assigned: ReadonlySet<number>;
    trailLength: number;
}

export function NodeTooltip({ node: d, assigned, trailLength }: Props) {
    const source = useSource();
    const run = source.run.value;

    /** The conflict-time trail is a literal set, not a full assignment. */
    const valueOf = (lit: number): Value =>
        assigned.has(lit) ? 1 : assigned.has(-lit) ? -1 : 0;

    return (
        <div class="flex min-w-40 flex-col gap-1">
            <div class="flex items-center gap-2">
                <span
                    class={cn(
                        "badge badge-xs",
                        kindOf(d) === "decision" && "badge-primary",
                        kindOf(d) === "conflict" && "badge-error",
                    )}
                >
                    {kindOf(d)}
                </span>
                <span class="font-mono font-semibold">{assignmentText(d)}</span>
            </div>

            <dl class="text-base-content grid grid-cols-[auto_1fr] gap-x-2">
                {d.eventIndex >= 0 && (
                    <>
                        <dt>event</dt>
                        <dd class="font-mono">#{d.eventIndex}</dd>
                    </>
                )}

                <dt>level</dt>
                <dd class="font-mono">@{d.level}</dd>

                {d.trailIndex >= 0 && (
                    <>
                        <dt>trail</dt>
                        <dd class="font-mono">
                            {d.trailIndex + 1}/{trailLength}
                        </dd>
                    </>
                )}
            </dl>

            <div class="border-base-300/80 mt-0.5 border-t pt-1">
                {!d.reasonLiterals && (
                    <>
                        {d.isDecision ? (
                            <div class="text-base-content">
                                {`${(run?.events[d.eventIndex] as DecideEvent).heuristic}`}
                            </div>
                        ) : (
                            "unit"
                        )}
                    </>
                )}
                {d.reasonLiterals && (
                    <>
                        <div class="text-base-content">
                            {d.isConflict ? "falsified by" : "forced by"}{" "}
                            <span class="font-mono">
                                {clauseRef(d.reasonClauseId)}
                            </span>
                        </div>
                        <ClauseChips
                            literals={d.reasonLiterals}
                            valueOf={valueOf}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
