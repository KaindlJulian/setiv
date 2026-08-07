import { useState } from "preact/hooks";
import { isAliveAt, type ClauseRecord } from "../model/clauseDatabase";
import { useSolverStore } from "../state/context";
import { ClauseList } from "./ClauseList";
import { CollapsibleSection } from "./CollapsibleSection";
import { StatsBar } from "./StatsBar";
import { TrailList } from "./TrailList";

type SectionId = "trail" | "original" | "learned" | "deleted";

export function Sidebar() {
    const store = useSolverStore();
    const [open, setOpen] = useState<SectionId | null>("trail");
    const run = store.run.value;
    const state = store.solverState.value;

    /** One section at a time, so the open one can claim the leftover height. */
    const section = (id: SectionId) => ({
        open: open === id,
        onToggle: () => setOpen(open === id ? null : id),
    });

    if (!run || !state) {
        return;
    }

    const counts = store.clauseCounts.value;
    const step = store.stepIndex.value;

    const original: ClauseRecord[] = [];
    const learned: ClauseRecord[] = [];
    const deleted: ClauseRecord[] = [];

    for (const record of run.clauseDb.clauses) {
        if (record.addedAt > step) {
            continue;
        }

        if (!isAliveAt(record, step)) {
            deleted.push(record);
        } else if (record.origin === "original") {
            original.push(record);
        } else {
            learned.push(record);
        }
    }

    return (
        <>
            <StatsBar />

            <CollapsibleSection
                title="Trail"
                badge={`${state.trail.length} - @${state.decisionLevel}`}
                {...section("trail")}
            >
                <TrailList state={state} />
            </CollapsibleSection>

            <CollapsibleSection
                title="Original clauses"
                badge={counts.original}
                {...section("original")}
            >
                <ClauseList
                    records={original}
                    state={state}
                    empty="No original clauses alive at this step."
                />
            </CollapsibleSection>

            <CollapsibleSection
                title="Learned"
                badge={counts.learned}
                {...section("learned")}
            >
                <ClauseList
                    records={learned}
                    state={state}
                    empty="Nothing learned yet at this step."
                />
            </CollapsibleSection>

            <CollapsibleSection
                title="Deleted"
                badge={counts.deleted}
                {...section("deleted")}
            >
                <ClauseList
                    records={deleted}
                    state={state}
                    empty="No clauses deleted yet."
                />
            </CollapsibleSection>
        </>
    );
}
