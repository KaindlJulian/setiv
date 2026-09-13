import {
    clauseById,
    isAliveAt,
    type ClauseSection,
} from "@/model/clauseDatabase";
import { type SolverRun } from "@/model/run";
import { batch, effect, signal, type ReadonlySignal } from "@preact/signals";
import { type CursorStore } from "./cursorStore";

export type TabId = "graph" | "tree" | "formula" | "bcp" | "log";

/**
 * Where the trail should scroll. Every request is a fresh object: asking for
 * the row that is already selected has to scroll to it again.
 */
export type TrailScroll = { to: "end" } | { to: "event"; event: number };
export type SidebarSection = "trail" | ClauseSection;

/**
 * whatis highlighted and what the user focussed
 */
export interface ViewStore {
    tab: ReadonlySignal<TabId>;

    visitedTabs: ReadonlySignal<ReadonlySet<TabId>>;
    showTab(id: TabId): void;

    sidebarSection: ReadonlySignal<SidebarSection | null>;
    toggleSection(id: SidebarSection): void;
    openSection(id: SidebarSection): void;

    selectedEvent: ReadonlySignal<number | null>;
    selectedClauseId: ReadonlySignal<number | null>;
    select(eventIndex: number | null): void;

    trailScroll: ReadonlySignal<TrailScroll>;
    /** Fresh on every clause reveal, for the same reason as `trailScroll`. */
    clauseScroll: ReadonlySignal<object>;
    revealTrailEnd(): void;

    revealInTrail(eventIndex: number): void;
    revealGraphNode(eventIndex: number, anchorStep: number): void;
    revealClause(clauseId: number): void;
    revealConflict(eventIndex: number): void;

    openEvent(eventIndex: number): void;
}

export function createViewStore(
    run: ReadonlySignal<SolverRun | null>,
    cursor: CursorStore,
): ViewStore {
    const tab = signal<TabId>("tree");
    const visitedTabs = signal<ReadonlySet<TabId>>(new Set<TabId>(["tree"]));
    const sidebarSection = signal<SidebarSection | null>("trail");
    const selectedEvent = signal<number | null>(null);
    const selectedClauseId = signal<number | null>(null);
    const trailScroll = signal<TrailScroll>({ to: "end" });
    const clauseScroll = signal<object>({});

    // A new run invalidates whatever was focused: the event indices are gone.
    effect(() => {
        run.value;
        batch(() => {
            selectedEvent.value = null;
            selectedClauseId.value = null;
            trailScroll.value = { to: "end" };
        });
    });

    const showTab = (id: TabId) => {
        batch(() => {
            tab.value = id;

            if (!visitedTabs.value.has(id)) {
                visitedTabs.value = new Set(visitedTabs.value).add(id);
            }
        });
    };

    const showSection = (id: SidebarSection | null) => {
        batch(() => {
            sidebarSection.value = id;

            if (id !== "trail") {
                return;
            }

            const event = selectedEvent.value;
            trailScroll.value =
                event === null ? { to: "end" } : { to: "event", event };
        });
    };

    const openSection = (id: SidebarSection) => {
        showSection(id);
    };

    const toggleSection = (id: SidebarSection) => {
        showSection(sidebarSection.value === id ? null : id);
    };

    const select = (eventIndex: number | null) => {
        batch(() => {
            selectedEvent.value = eventIndex;
            selectedClauseId.value = null;
        });
    };

    const revealTrailEnd = () => {
        trailScroll.value = { to: "end" };
    };

    const revealInTrail = (eventIndex: number) => {
        batch(() => {
            select(eventIndex);
            sidebarSection.value = "trail";
            trailScroll.value = { to: "event", event: eventIndex };
        });
    };

    const revealGraphNode = (eventIndex: number, anchorStep: number) => {
        batch(() => {
            // for snapshot graphs its important to jump to the conflict event
            if (anchorStep >= 0) {
                cursor.jumpTo(anchorStep);
            }

            select(eventIndex);
            sidebarSection.value = "trail";
            trailScroll.value = { to: "event", event: eventIndex };
        });
    };

    const revealClause = (clauseId: number) => {
        const db = run.value?.clauseDb;
        const record = db ? clauseById(db, clauseId) : null;

        if (!record) {
            return;
        }

        batch(() => {
            selectedEvent.value = null;
            selectedClauseId.value = clauseId;
            sidebarSection.value = isAliveAt(record, cursor.stepIndex.value)
                ? record.origin
                : "deleted";
            clauseScroll.value = {};
        });
    };

    const revealConflict = (eventIndex: number) => {
        batch(() => {
            cursor.jumpTo(eventIndex);
            select(null);
            showTab("graph");
            trailScroll.value = { to: "end" };
        });
    };

    const openEvent = (eventIndex: number) => {
        const event = run.value?.events[eventIndex];

        if (!event) {
            return;
        }

        switch (event.event) {
            case "decide":
            case "propagate":
            case "backtrack":
                batch(() => {
                    cursor.jumpTo(eventIndex);
                    showTab("tree");
                    revealInTrail(eventIndex);
                });
                return;
            case "conflict":
            case "learn":
                revealConflict(eventIndex);
                return;
            default:
                batch(() => {
                    cursor.jumpTo(eventIndex);
                    showTab(event.event === "inspect" ? "bcp" : "log");
                    select(null);
                    revealTrailEnd();
                });
        }
    };

    return {
        tab,
        visitedTabs,
        showTab,
        sidebarSection,
        toggleSection,
        openSection,
        selectedEvent,
        selectedClauseId,
        select,
        trailScroll,
        clauseScroll,
        revealTrailEnd,
        revealInTrail,
        revealGraphNode,
        revealClause,
        revealConflict,
        openEvent,
    };
}
