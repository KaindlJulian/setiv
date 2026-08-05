import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { cn } from "../lib/cn";
import { useSolverStore } from "../state/context";
import { DecisionTree } from "./DecisionTree";
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
    const store = useSolverStore();
    const [tab, setTab] = useState<TabId>("graph");

    const run = store.run.value;

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
                <ImplicationPanel key={store.selectedConflictIndex.value} />
            </TabPanel>

            <TabPanel active={tab === "tree"}>
                <Panel
                    fill
                    title={`Decision Tree (${run.tree.decisionCount} decisions)`}
                >
                    <DecisionTree />
                </Panel>
            </TabPanel>

            <TabPanel active={tab === "formula"}>
                <Panel fill title="Formula">
                    <MonoTextArea fill value={store.formulaText.value} />
                </Panel>
            </TabPanel>

            <TabPanel active={tab === "log"}>
                <Panel fill title="Event Log">
                    <MonoTextArea fill value={store.rawText.value} />
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
