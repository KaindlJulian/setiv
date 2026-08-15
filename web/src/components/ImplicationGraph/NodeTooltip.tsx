import { cn } from "@/lib/cn";
import { clauseRef, litLabel } from "@/lib/format";
import type { DecideEvent } from "@/model/events";
import type { ImplicationNode } from "@/model/implicationGraph";
import { useSource } from "@/state/context";
import { assignmentText, kindOf } from "@/view/implicationNode";

const maxReasonClauseChips = 5;

interface Props {
    node: ImplicationNode;
    assigned: ReadonlySet<number>;
    trailLength: number;
}

/** Tints a clause literal by the value the trail gave it. */
const litValueClass = (lit: number, assigned: ReadonlySet<number>): string => {
    if (assigned.has(lit)) {
        return "text-setiv-true";
    }
    if (assigned.has(-lit)) {
        return "text-setiv-false";
    }
    return "text-base-content/50";
};

export function NodeTooltip({ node: d, assigned, trailLength }: Props) {
    const source = useSource();
    const run = source.run.value;

    return (
        <div class="flex flex-col gap-1">
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
                        <div class="mt-1 flex flex-wrap gap-1 font-mono">
                            {d.reasonLiterals
                                .slice(0, maxReasonClauseChips)
                                .map((lit, i) => (
                                    <span
                                        key={i}
                                        class={cn(
                                            "bg-base-200 rounded px-1",
                                            litValueClass(lit, assigned),
                                        )}
                                    >
                                        {litLabel(lit)}
                                    </span>
                                ))}

                            {d.reasonLiterals.length > maxReasonClauseChips && (
                                <span class="bg-base-200 text-base-content/50 rounded px-1">
                                    +
                                    {d.reasonLiterals.length -
                                        maxReasonClauseChips}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
