import { DecisionTreePanel } from "@/components/DecisionTree/DecisionTreePanel";
import { ImplicationPanel } from "@/components/ImplicationGraph/ImplicationPanel";
import { cn } from "@/lib/cn";
import { useProjections, useSource } from "@/state/context";
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { MonoTextArea } from "./MonoTextArea";
import { Panel } from "./Panel";
import { StepBar } from "./StepBar";

type TabId = "graph" | "tree" | "formula" | "log";

const tabs = [
    { id: "graph", label: "Implication Graph" },
    { id: "tree", label: "Decision Tree" },
    { id: "formula", label: "Formula" },
    { id: "log", label: "Event Log" },
] as const;

export function Workspace() {
    const source = useSource();
    const projections = useProjections();
    const [tab, setTab] = useState<TabId>("graph");

    const [visited, setVisited] = useState<ReadonlySet<TabId>>(
        () => new Set<TabId>(["graph"]),
    );

    const run = source.run.value;

    if (!run) {
        return null;
    }

    const show = (id: TabId) => {
        setTab(id);

        if (!visited.has(id)) {
            setVisited(new Set(visited).add(id));
        }
    };

    return (
        <div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <div role="tablist" class="tabs tabs-sm tabs-border shrink-0">
                {tabs.map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        onClick={() => show(id)}
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
                    <MonoTextArea fill value={source.rawText.value} />
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
