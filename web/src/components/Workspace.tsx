import { DecisionTreePanel } from "@/components/DecisionTree/DecisionTreePanel";
import { ImplicationPanel } from "@/components/ImplicationGraph/ImplicationPanel";
import { cn } from "@/lib/cn";
import { useSource, useView } from "@/state/context";
import type { TabId } from "@/state/viewStore";
import type { ComponentChildren } from "preact";
import { BcpPanel } from "./BcpPanel";
import { EventLog } from "./EventLog";
import { FormulaPanel } from "./FormulaPanel";
import { Panel } from "./Panel";
import { StepBar } from "./StepBar";

const tabs = [
    { id: "tree", label: "Decision Tree" },
    { id: "graph", label: "Implication Graph" },
    { id: "formula", label: "Formula" },
    { id: "bcp", label: "BCP" },
    { id: "log", label: "Event Log" },
] as const;

export function Workspace() {
    const source = useSource();
    const view = useView();

    const visited = view.visitedTabs.value;

    const run = source.run.value;

    if (!run) {
        return null;
    }

    const hasBcp = run.stats.inspections > 0;
    const tab = view.tab.value;

    return (
        <div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <div
                role="tablist"
                class="tabs tabs-box tabs-sm shrink-0 shadow-none"
            >
                {tabs
                    .filter((t) => (t.id === "bcp" ? hasBcp : true))
                    .map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={tab === id}
                            onClick={() => view.showTab(id)}
                            class={cn(
                                "tab shadow-none",
                                tab === id && "tab-active",
                            )}
                        >
                            {label}
                        </button>
                    ))}
            </div>
            <TabPanel id="tree" tab={tab} visited={visited}>
                <DecisionTreePanel />
            </TabPanel>

            <TabPanel id="graph" tab={tab} visited={visited}>
                <ImplicationPanel />
            </TabPanel>

            <TabPanel id="formula" tab={tab} visited={visited}>
                <FormulaPanel />
            </TabPanel>

            {hasBcp && (
                <TabPanel id="bcp" tab={tab} visited={visited}>
                    <BcpPanel active={tab === "bcp"} />
                </TabPanel>
            )}

            <TabPanel id="log" tab={tab} visited={visited}>
                <Panel fill title="Event Log">
                    <EventLog active={tab === "log"} />
                </Panel>
            </TabPanel>

            <div class="card card-border border-base-300 bg-base-100 overflow-hidden">
                <StepBar />
            </div>
        </div>
    );
}

function TabPanel({
    id,
    tab,
    visited,
    children,
}: {
    id: TabId;
    tab: TabId;
    visited: ReadonlySet<TabId>;
    children: ComponentChildren;
}) {
    if (!visited.has(id)) {
        return null;
    }

    return (
        <div
            class={cn(
                "min-h-0 flex-1 flex-col",
                tab === id ? "flex" : "hidden",
            )}
        >
            {children}
        </div>
    );
}
