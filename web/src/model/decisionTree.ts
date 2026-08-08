import type { EventOf } from "./events";

export type TreeNodeKind = "root" | "decision" | "propagation" | "conflict";

export interface TreeNode {
    id: string;
    kind: TreeNodeKind;
    /** signed literal, null for root and conflict nodes. */
    lit: number | null;
    level: number;
    reasonClauseId: number | null;
    isBacktracked: boolean;
    children: TreeNode[];
    /** propagations collapsed into this node, only set by decisionsOnly */
    impliedCount?: number;
}

export interface DecisionTree {
    root: TreeNode;
    decisionCount: number;
    nodeCount: number;
}

/** trees larger than this open in decisions-only mode */
export const treeNodeThreshold = 400;

/** builder for constructing a decision tree */
export interface DecisionTreeBuilder {
    decide(ev: EventOf<"decide">): void;
    propagate(ev: EventOf<"propagate">): void;
    conflict(ev: EventOf<"conflict">): void;
    backtrackTo(keepLevel: number): void;
    finish(): DecisionTree;
}

export function createDecisionTreeBuilder(): DecisionTreeBuilder {
    let counter = 0;
    const newId = () => `n${counter++}`;

    const makeNode = (
        kind: TreeNodeKind,
        lit: number | null,
        level: number,
        reasonClauseId: number | null,
    ): TreeNode => ({
        id: newId(),
        kind,
        lit,
        level,
        reasonClauseId,
        isBacktracked: false,
        children: [],
    });

    const root = makeNode("root", null, 0, null);

    /**
     * Nodes whose assignments are still on the trail
     * in assignment order
     */
    let active: TreeNode[] = [root];
    let decisionCount = 0;

    /**
     * The deepest active node this one can be placed under
     */
    const parentFor = (level: number): TreeNode => {
        for (let i = active.length - 1; i >= 0; i--) {
            if (active[i].level <= level) {
                return active[i];
            }
        }

        return root;
    };

    const push = (node: TreeNode) => {
        parentFor(node.level).children.push(node);
        active.push(node);
    };

    const markSubtreeBacktracked = (node: TreeNode) => {
        if (node.isBacktracked) {
            return; // already abandoned by an earlier unwind
        }

        node.isBacktracked = true;

        for (const child of node.children) {
            markSubtreeBacktracked(child);
        }
    };

    return {
        decide(ev) {
            push(makeNode("decision", ev.literal, ev.level, null));
            decisionCount++;
        },

        propagate(ev) {
            push(
                makeNode(
                    "propagation",
                    ev.literal,
                    ev.level,
                    ev.reason_clause_id,
                ),
            );
        },

        conflict(ev) {
            push(makeNode("conflict", null, ev.level, ev.clause_id));
        },

        // Same stable filter the trail uses
        backtrackTo(keepLevel) {
            const kept: TreeNode[] = [];

            for (const node of active) {
                if (node.level <= keepLevel) {
                    kept.push(node);
                } else {
                    markSubtreeBacktracked(node);
                }
            }

            active = kept;
        },

        finish: () => ({ root, decisionCount, nodeCount: counter }),
    };
}

/** a copy with its own children array, so derivations never touch the source tree */
const copyNode = (node: TreeNode): TreeNode => ({ ...node, children: [] });

export function decisionsOnly(tree: DecisionTree): DecisionTree {
    const root = copyNode(tree.root);

    /** source node paired with the copy of its nearest surviving ancestor */
    const work: [TreeNode, TreeNode][] = [[tree.root, root]];
    let nodeCount = 1;
    let decisionCount = 0;

    while (work.length > 0) {
        const [source, keeper] = work.pop()!;

        for (const child of source.children) {
            if (child.kind === "propagation") {
                keeper.impliedCount = (keeper.impliedCount ?? 0) + 1;
                work.push([child, keeper]);
                continue;
            }

            const copy = copyNode(child);
            keeper.children.push(copy);
            work.push([child, copy]);
            nodeCount++;

            if (child.kind === "decision") {
                decisionCount++;
            }
        }
    }

    return { root, decisionCount, nodeCount };
}

/**
 * The first n nodes in breadth-first order
 */
export function truncateTree(tree: DecisionTree, n: number): DecisionTree {
    if (tree.nodeCount <= n) {
        return tree;
    }

    const root = copyNode(tree.root);
    const queue: [TreeNode, TreeNode][] = [[tree.root, root]];
    let nodeCount = 1;
    let decisionCount = 0;

    for (let i = 0; i < queue.length && nodeCount < n; i++) {
        const [source, copy] = queue[i];

        for (const child of source.children) {
            if (nodeCount >= n) {
                break;
            }

            const childCopy = copyNode(child);
            copy.children.push(childCopy);
            queue.push([child, childCopy]);
            nodeCount++;

            if (child.kind === "decision") {
                decisionCount++;
            }
        }
    }

    return { root, decisionCount, nodeCount };
}
