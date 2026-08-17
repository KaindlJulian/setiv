import { Panel } from "@/components/Panel";
import { ScopeToggle, type ScopeOption } from "@/components/ScopeToggle";
import { compactCount } from "@/lib/format";
import { type TreeNode } from "@/model/decisionTree";
import { useSource, useTrees, useView } from "@/state/context";
import { DecisionTree } from "./DecisionTree";

const modes: ScopeOption<boolean>[] = [
    {
        value: true,
        label: "Decisions",
        title: "Propagation chains collapsed into the decision that caused them",
    },
    {
        value: false,
        label: "Propagations",
        title: "Every propagation drawn as its own node",
    },
];

export function DecisionTreePanel() {
    const trees = useTrees();
    const view = useView();
    const run = useSource().run.value;

    const tree = trees.tree.value;
    const hidden = tree?.hiddenNodeCount ?? 0;
    const expanded = trees.hasExpansions.value;

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
                    <button
                        type="button"
                        class="btn btn-xs"
                        disabled={!expanded && hidden === 0}
                        onClick={expanded ? trees.collapseAll : trees.expandAll}
                    >
                        {expanded ? "Collapse All" : "Expand All"}
                    </button>
                    <ScopeToggle
                        scopes={modes}
                        value={trees.folded.value}
                        onChange={trees.setFolded}
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
