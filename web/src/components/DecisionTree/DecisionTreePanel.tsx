import { Panel } from "@/components/Panel";
import { ScopeToggle, type ScopeOption } from "@/components/ScopeToggle";
import { compactCount } from "@/lib/format";
import { type TreeNode, type TreeScope } from "@/model/decisionTree";
import { useSource, useTrees, useView } from "@/state/context";
import { DecisionTree } from "./DecisionTree";

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
    const view = useView();
    const run = useSource().run.value;

    const tree = trees.tree.value;
    const hidden = tree?.hiddenNodeCount ?? 0;

    const select = (node: TreeNode) => {
        if (node.kind === "conflict") {
            view.revealConflict(node.id);
        } else {
            view.revealInTrail(node.id);
        }
    };

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
                            Collapse All
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
            <DecisionTree
                tree={tree}
                onExpand={trees.toggleExpanded}
                onSelect={select}
            />
        </Panel>
    );
}
