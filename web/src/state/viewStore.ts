import { type ClauseSection } from "@/model/clauseDatabase";
import { type SolverRun } from "@/model/run";
import { batch, effect, signal, type ReadonlySignal } from "@preact/signals";
import { type CursorStore } from "./cursorStore";

export type TabId = "graph" | "tree" | "formula" | "log";
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
    select(eventIndex: number | null): void;

    revealInTrail(eventIndex: number): void;
    revealConflict(eventIndex: number): void;
}

export function createViewStore(
    run: ReadonlySignal<SolverRun | null>,
    cursor: CursorStore,
): ViewStore {
    const tab = signal<TabId>("graph");
    const visitedTabs = signal<ReadonlySet<TabId>>(new Set<TabId>(["graph"]));
    const sidebarSection = signal<SidebarSection | null>("trail");
    const selectedEvent = signal<number | null>(null);

    // A new run invalidates whatever was focused: the event indices are gone.
    effect(() => {
        run.value;
        selectedEvent.value = null;
    });

    const showTab = (id: TabId) => {
        batch(() => {
            tab.value = id;

            if (!visitedTabs.value.has(id)) {
                visitedTabs.value = new Set(visitedTabs.value).add(id);
            }
        });
    };

    const openSection = (id: SidebarSection) => {
        sidebarSection.value = id;
    };

    const toggleSection = (id: SidebarSection) => {
        sidebarSection.value = sidebarSection.value === id ? null : id;
    };

    const select = (eventIndex: number | null) => {
        selectedEvent.value = eventIndex;
    };

    const revealInTrail = (eventIndex: number) => {
        batch(() => {
            selectedEvent.value = eventIndex;
            sidebarSection.value = "trail";
        });
    };

    const revealConflict = (eventIndex: number) => {
        batch(() => {
            cursor.jumpTo(eventIndex);
            selectedEvent.value = null;
            showTab("graph");
        });
    };

    return {
        tab,
        visitedTabs,
        showTab,
        sidebarSection,
        toggleSection,
        openSection,
        selectedEvent,
        select,
        revealInTrail,
        revealConflict,
    };
}
