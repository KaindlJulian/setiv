import { compactCount } from "../lib/format";
import { type TreeScope } from "../model/decisionTree";
import { useSource, useTrees } from "../state/context";
import { DecisionTree } from "./DecisionTree";
import { Panel } from "./Panel";
import { ScopeToggle, type ScopeOption } from "./ScopeToggle";

const scopes: ScopeOption<TreeScope>[] = [
    {
        value: "active",
        label: "Active",
        title: "The trail at the current step, with backtracked branches collapsed",
    },
    {
        value: "decisions",
        label: "Decisions",
        title: "The whole search, propagation chains collapsed into the decision that caused them",
    },
    {
        value: "full",
        label: "Full",
        title: "The complete decision tree",
    },
];

export function DecisionTreePanel() {
    const trees = useTrees();
    const run = useSource().run.value;

    const tree = trees.tree.value;
    const hidden = tree?.hiddenNodeCount ?? 0;

    return (
        <Panel
            fill
            title={`Decision Tree (${run?.stats.decisions ?? 0} decisions)`}
            actions={
                <div class="flex flex-wrap items-center gap-2">
                    {hidden > 0 && (
                        <span class="badge badge-warning badge-sm">
                            {compactCount(hidden)} nodes collapsed
                        </span>
                    )}
                    {trees.hasExpansions.value && (
                        <button
                            type="button"
                            class="btn btn-xs"
                            onClick={trees.collapseAll}
                        >
                            Collapse all
                        </button>
                    )}
                    <ScopeToggle
                        scopes={scopes}
                        value={trees.scope.value}
                        onChange={trees.setScope}
                    />
                </div>
            }
        >
            <DecisionTree tree={tree} onExpand={trees.toggleExpanded} />
        </Panel>
    );
}
