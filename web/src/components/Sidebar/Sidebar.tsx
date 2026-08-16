import {
    clausesInSectionAt,
    type ClauseRecord,
    type ClauseSection,
} from "@/model/clauseDatabase";
import { useCursor, useProjections, useSource, useView } from "@/state/context";
import type { SidebarSection } from "@/state/viewStore";
import { useMemo } from "preact/hooks";
import { ClauseList } from "./ClauseList";
import { CollapsibleSection } from "./CollapsibleSection";
import { StatsBar } from "./StatsBar";
import { TrailList } from "./TrailList";

const noRecords: ClauseRecord[] = [];

export function Sidebar() {
    const projections = useProjections();
    const cursor = useCursor();
    const view = useView();
    const open = view.sidebarSection.value;
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

    /** one is open at a time */
    const section = (id: SidebarSection) => ({
        open: open === id,
        onToggle: () => view.toggleSection(id),
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
                    empty="Nothing learned at this step."
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
                    empty="No clauses deleted at this step."
                />
            </CollapsibleSection>
        </>
    );
}
