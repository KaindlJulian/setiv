import { DecisionTreePanel } from "@/components/DecisionTree/DecisionTreePanel";
import { ImplicationPanel } from "@/components/ImplicationGraph/ImplicationPanel";
import { cn } from "@/lib/cn";
import { useProjections, useSource, useView } from "@/state/context";
import type { TabId } from "@/state/viewStore";
import type { ComponentChildren } from "preact";
import { EventLog } from "./EventLog";
import { MonoTextArea } from "./MonoTextArea";
import { Panel } from "./Panel";
import { StepBar } from "./StepBar";

const tabs = [
    { id: "graph", label: "Implication Graph" },
    { id: "tree", label: "Decision Tree" },
    { id: "formula", label: "Formula" },
    { id: "log", label: "Event Log" },
] as const;

export function Workspace() {
    const source = useSource();
    const projections = useProjections();
    const view = useView();

    const tab = view.tab.value;
    const visited = view.visitedTabs.value;

    const run = source.run.value;

    if (!run) {
        return null;
    }

    return (
        <div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <div
                role="tablist"
                class="tabs tabs-sm tabs-box shrink-0 shadow-none"
            >
                {tabs.map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        onClick={() => view.showTab(id)}
                        class={cn("tab", tab === id && "tab-active")}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <TabPanel id="graph" tab={tab} visited={visited}>
                <ImplicationPanel />
            </TabPanel>

            <TabPanel id="tree" tab={tab} visited={visited}>
                <DecisionTreePanel />
            </TabPanel>

            <TabPanel id="formula" tab={tab} visited={visited}>
                <Panel fill title="Formula">
                    <MonoTextArea fill value={projections.formulaText.value} />
                </Panel>
            </TabPanel>

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
