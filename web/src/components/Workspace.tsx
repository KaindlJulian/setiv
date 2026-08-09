import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { cn } from "../lib/cn";
import { useProjections, useSource } from "../state/context";
import { DecisionTreePanel } from "./DecisionTreePanel";
import { ImplicationPanel } from "./ImplicationPanel";
import { MonoTextArea } from "./MonoTextArea";
import { Panel } from "./Panel";

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

    const run = source.run.value;

    if (!run) {
        return null;
    }

    return (
        <div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <div role="tablist" class="tabs tabs-border shrink-0">
                {tabs.map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        onClick={() => setTab(id)}
                        class={cn("tab", tab === id && "tab-active")}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <TabPanel active={tab === "graph"}>
                <ImplicationPanel />
            </TabPanel>

            <TabPanel active={tab === "tree"}>
                <DecisionTreePanel />
            </TabPanel>

            <TabPanel active={tab === "formula"}>
                <Panel fill title="Formula">
                    <MonoTextArea fill value={projections.formulaText.value} />
                </Panel>
            </TabPanel>

            <TabPanel active={tab === "log"}>
                <Panel fill title="Event Log">
                    <MonoTextArea fill value={source.rawText.value} />
                </Panel>
            </TabPanel>
        </div>
    );
}

function TabPanel({
    active,
    children,
}: {
    active: boolean;
    children: ComponentChildren;
}) {
    return (
        <div class={cn("min-h-0 flex-1 flex-col", active ? "flex" : "hidden")}>
            {children}
        </div>
    );
}
