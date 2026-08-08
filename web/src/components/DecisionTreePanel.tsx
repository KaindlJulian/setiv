import { useMemo, useState } from "preact/hooks";
import { truncateTree } from "../model/decisionTree";
import { useTrees } from "../state/context";
import { treeChart } from "../view/theme";
import { DecisionTree } from "./DecisionTree";
import { Panel } from "./Panel";
import { ScopeToggle, type ScopeOption } from "./ScopeToggle";

const scopes: ScopeOption<boolean>[] = [
    {
        value: false,
        label: "Full",
        title: "Every decision, propagation and conflict",
    },
    {
        value: true,
        label: "Decisions",
        title: "Propagation chains collapsed into the decision that caused them",
    },
];

export function DecisionTreePanel() {
    const trees = useTrees();
    const [override, setOverride] = useState<boolean | null>(null);

    const full = trees.fullTree.value;
    const decisions = override ?? trees.decisionsDefault.value;
    const selected = decisions ? trees.decisionsTree.value : full;

    const shown = useMemo(
        () => (selected ? truncateTree(selected, treeChart.maxNodes) : null),
        [selected],
    );

    const truncated = selected != null && shown !== selected;

    return (
        <Panel
            fill
            title={`Decision Tree (${full?.decisionCount} decisions)`}
            actions={
                <div class="flex flex-wrap items-center gap-2">
                    {truncated && (
                        <span class="badge badge-warning badge-sm">
                            showing {shown!.nodeCount} of {selected!.nodeCount}{" "}
                            nodes
                        </span>
                    )}
                    <ScopeToggle
                        scopes={scopes}
                        value={decisions}
                        onChange={setOverride}
                    />
                </div>
            }
        >
            <DecisionTree tree={shown} decisionsOnly={decisions} />
        </Panel>
    );
}
