import { useMemo, useState } from "preact/hooks";
import {
    clausesInSectionAt,
    type ClauseRecord,
    type ClauseSection,
} from "@/model/clauseDatabase";
import { useCursor, useProjections, useSource } from "@/state/context";
import { ClauseList } from "./ClauseList";
import { CollapsibleSection } from "./CollapsibleSection";
import { StatsBar } from "./StatsBar";
import { TrailList } from "./TrailList";

type SectionId = "trail" | ClauseSection;

const noRecords: ClauseRecord[] = [];

export function Sidebar() {
    const projections = useProjections();
    const cursor = useCursor();
    const [open, setOpen] = useState<SectionId | null>("trail");
    const run = useSource().run.value;
    const state = projections.solverState.value;
    const step = cursor.stepIndex.value;

    const records = useMemo(
        () =>
            run && open && open !== "trail"
                ? clausesInSectionAt(run.clauseDb, open, step)
                : noRecords,
        [run, open, step],
    );

    /** One section at a time, so the open one can claim the leftover height. */
    const section = (id: SectionId) => ({
        open: open === id,
        onToggle: () => setOpen(open === id ? null : id),
    });

    const listFor = (id: ClauseSection) => (open === id ? records : noRecords);

    if (!run || !state) {
        return;
    }

    const counts = projections.clauseCounts.value;

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
                    records={listFor("original")}
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
                    records={listFor("learned")}
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
                    records={listFor("deleted")}
                    state={state}
                    empty="No clauses deleted yet."
                />
            </CollapsibleSection>
        </>
    );
}
