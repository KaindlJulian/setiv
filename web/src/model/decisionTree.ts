import type { EventOf, SolverEvent } from "./events";

export type TreeNodeKind =
    "root" | "decision" | "propagation" | "conflict" | "collapsed";

/**
 * - `full` and `decisions` are whole-run views, bounded by the node budget.
 * - `active` is the trail at the cursor, with every abandoned branch hanging off
 *   it replaced by a single node.
 */
export type TreeScope = "active" | "decisions" | "full";

export interface TreeNode {
    /** Event index of the node. `ROOT` for the root, first source when collapsed. */
    id: number;
    /** Stable render key. For collapsed nodes it is what `expanded` holds. */
    key: string;
    kind: TreeNodeKind;
    /** signed literal, null for root, conflict and collapsed nodes. */
    lit: number | null;
    level: number;
    reasonClauseId: number | null;
    isBacktracked: boolean;
    children: TreeNode[];
    /** propagations folded into this node, set whenever propagations collapse */
    impliedCount?: number;
    /** collapsed only: the subtree roots this node stands for */
    sources?: number[];
    /** collapsed only: how many nodes are hidden behind it */
    hiddenCount?: number;
}

export interface DecisionTree {
    root: TreeNode;
    scope: TreeScope;
    /** decisions actually drawn */
    decisionCount: number;
    /** nodes actually drawn, root and collapsed markers included */
    nodeCount: number;
    /** nodes standing behind the collapsed markers */
    hiddenNodeCount: number;
}

/** trees smaller than this open in full mode */
export const treeNodeThreshold = 400;

/** `parent` of a node the root owns */
export const ROOT = -1;
/** `parent` of an event that is not a tree node at all */
const ABSENT = -2;
/** `removedAt` of a node that was never unwound */
const NEVER = 0x7fffffff;

/**
 * The whole decision tree represented as five arrays, keyed by event index.
 *
 * Instead of a lot of children arrays, we use CSR adjacency matrix type of apporach
 */
export interface TreeSkeleton {
    events: readonly SolverEvent[];
    /** parent[i] = event index of the parent of `i` (`ABSENT` if `i` is not a node, `ROOT` if the the root own `i`) */
    parent: Int32Array;
    /** removedAt[i] = event index of the backtrack event that unwound `i`, else `NEVER`. Allows for checking when a node was backtracked / if it is still active. */
    removedAt: Int32Array;
    /** CSR offsets; children of bucket `b` are `childList[start[b]..start[b+1])` */
    childStart: Int32Array;
    /** child event indices, increasing within each bucket */
    childList: Int32Array;
    /** whole-run descendant count, the node itself included */
    size: Int32Array;
    /** the explicit root bucket in `childStart` and `size` */
    rootBucket: number;
    nodeCount: number;
    decisionCount: number;
    lastStep: number;
}

/**
 * Three linear passes over the event log
 */
export function buildTreeSkeleton(
    events: readonly SolverEvent[],
): TreeSkeleton {
    const n = events.length;
    const parent = new Int32Array(n).fill(ABSENT);
    const removedAt = new Int32Array(n).fill(NEVER);

    /** Nodes whose assignments are still on the trail, in assignment order. */
    let activeIdx = new Int32Array(1024);
    let activeLvl = new Int32Array(1024);
    let activeLength = 0;

    let nodeCount = 1; // the root
    let decisionCount = 0;

    const pushActive = (id: number, level: number) => {
        if (activeLength === activeIdx.length) {
            const grownIdx = new Int32Array(activeLength * 2);
            const grownLvl = new Int32Array(activeLength * 2);
            grownIdx.set(activeIdx);
            grownLvl.set(activeLvl);
            activeIdx = grownIdx;
            activeLvl = grownLvl;
        }

        activeIdx[activeLength] = id;
        activeLvl[activeLength] = level;
        activeLength++;
    };

    // First pass: forward replay of events, build parent and removedAt arrays
    for (let i = 0; i < n; i++) {
        const ev = events[i];

        switch (ev.event) {
            case "decide":
            case "propagate":
            case "conflict": {
                const level = ev.level;

                // The deepest active node this one can be placed under.
                let deepestActiveParent = ROOT;

                for (let j = activeLength - 1; j >= 0; j--) {
                    if (activeLvl[j] <= level) {
                        deepestActiveParent = activeIdx[j];
                        break;
                    }
                }

                parent[i] = deepestActiveParent;
                nodeCount++;

                if (ev.event === "decide") {
                    decisionCount++;
                }

                pushActive(i, level);
                break;
            }
            case "backtrack": {
                let w = 0;

                // iterate over active trail and mark backtracked nodes
                for (let j = 0; j < activeLength; j++) {
                    if (activeLvl[j] <= ev.to_level) {
                        activeIdx[w] = activeIdx[j];
                        activeLvl[w] = activeLvl[j];
                        w++;
                    } else {
                        removedAt[activeIdx[j]] = i;
                    }
                }

                activeLength = w;
                break;
            }

            default:
                break;
        }
    }

    const rootBucket = n;
    const bucketOf = (id: number) => (id === ROOT ? rootBucket : id);

    // CSR children: count into the slot one past the bucket, then prefix-sum.
    const childStart = new Int32Array(n + 2);

    for (let i = 0; i < n; i++) {
        if (parent[i] !== ABSENT) {
            childStart[bucketOf(parent[i]) + 1]++;
        }
    }

    for (let b = 0; b <= n; b++) {
        childStart[b + 1] += childStart[b];
    }

    const childList = new Int32Array(nodeCount - 1);
    const fill = childStart.slice(0, n + 1);

    for (let i = 0; i < n; i++) {
        if (parent[i] !== ABSENT) {
            childList[fill[bucketOf(parent[i])]++] = i;
        }
    }

    // `parent[i] < i` always, so one reverse pass totals every subtree.
    const size = new Int32Array(n + 1);
    size[rootBucket] = 1;

    for (let i = 0; i < n; i++) {
        if (parent[i] !== ABSENT) {
            size[i] = 1;
        }
    }

    for (let i = n - 1; i >= 0; i--) {
        if (parent[i] !== ABSENT) {
            size[bucketOf(parent[i])] += size[i];
        }
    }

    return {
        events,
        parent,
        removedAt,
        childStart,
        childList,
        size,
        rootBucket,
        nodeCount,
        decisionCount,
        lastStep: n - 1,
    };
}

/** abandoned branches shown one-per-node before they merge into an aggregate */
export const stubFanout = 6;
/** branches an expanded aggregate reveals before the rest re-aggregate */
export const stubPageSize = 32;
/** nodes a single expansion is allowed to draw */
export const stubExpandBudget = 200;

export interface MaterializeOptions {
    scope: TreeScope;
    /** the cursor, relevant for active mode only */
    step: number;
    /** keys of the collapsed nodes the user has clicked open */
    expanded: ReadonlySet<string>;
    /** max number of nodes */
    budget: number;
    fanout?: number;
    pageSize?: number;
    expandBudget?: number;
}

/**
 * Grows the bounded d3 tree, renders out of the skeleton.
 * Whatever it cannot draw becomes a collapsed node. drawing order is bfs
 *
 * 2 Budgets:
 * - capacity: number of real nodes that can be drawn
 * - markersCapacity: number of collapsed nodes that can be drawn
 *
 * The recursion:
 * grow -> collapseRest -> emitStub -> grow
 */
export function materializeTree(
    skeleton: TreeSkeleton,
    opts: MaterializeOptions,
): DecisionTree {
    const { events, removedAt, childStart, childList, size } = skeleton;

    const fanout = opts.fanout ?? stubFanout;
    const pageSize = opts.pageSize ?? stubPageSize;
    const expandBudget = opts.expandBudget ?? stubExpandBudget;

    /**
     * Only `active` follows the cursor, for other scopes its the last step
     */
    const step =
        opts.scope === "active"
            ? Math.min(Math.max(opts.step, 0), skeleton.lastStep)
            : skeleton.lastStep;

    const foldPropagations = opts.scope !== "full";

    let nodeCount = 1;
    let decisionCount = 0;
    let hiddenCount = 0;

    let capacity = opts.budget;
    let markersCapacity = Math.max(32, opts.budget >> 2);

    const root: TreeNode = {
        id: ROOT,
        key: "root",
        kind: "root",
        lit: null,
        level: 0,
        reasonClauseId: null,
        isBacktracked: false,
        children: [],
    };

    const bucketOf = (id: number) => (id === ROOT ? skeleton.rootBucket : id);
    const isPropagation = (id: number) => events[id].event === "propagate";
    const levelOf = (id: number) => {
        const ev = events[id];
        if (!("level" in ev)) {
            console.log("event without level", ev);
        }
        return "level" in ev ? ev.level : 0;
    };

    const makeNode = (id: number, isBacktracked: boolean): TreeNode => {
        const ev = events[id];

        if (ev.event === "decide") {
            return {
                id,
                key: `n${id}`,
                kind: "decision",
                lit: ev.literal,
                level: ev.level,
                reasonClauseId: null,
                isBacktracked,
                children: [],
            };
        }

        if (ev.event === "propagate") {
            return {
                id,
                key: `n${id}`,
                kind: "propagation",
                lit: ev.literal,
                level: ev.level,
                reasonClauseId: ev.reason_clause_id,
                isBacktracked,
                children: [],
            };
        }

        const conflict = ev as EventOf<"conflict">;

        return {
            id,
            key: `n${id}`,
            kind: "conflict",
            lit: null,
            level: conflict.level,
            reasonClauseId: conflict.clause_id,
            isBacktracked,
            children: [],
        };
    };

    /**
     * Attach a collapsed marker for `sources` (one or many subtree roots) to `holder`.
     *
     * Or draw the branch if marker is expanded:
     * - A marker standing for a single branch expands into that branch.
     * - A marker standing for many expands into a page of per-branch markers.
     */
    const emitStub = (
        holder: TreeNode,
        sources: number[],
        isBacktracked: boolean,
    ) => {
        if (sources.length === 0) {
            return;
        }

        const single = sources.length === 1;
        const key = single ? `x${sources[0]}` : `g${sources[0]}`;

        // marker is expanded, draw the branch isntead
        if (opts.expanded.has(key)) {
            if (single) {
                capacity += expandBudget;
                grow(holder, sources, isBacktracked);
            } else {
                markersCapacity += pageSize + 1;
                emitPage(holder, sources, isBacktracked);
            }
            return;
        }

        let hidden = 0;
        for (const source of sources) {
            hidden += size[source];
        }
        hiddenCount += hidden;

        // no budget -> return
        if (markersCapacity <= 0) {
            return;
        }

        holder.children.push({
            id: sources[0],
            key,
            kind: "collapsed",
            lit: null,
            level: levelOf(sources[0]),
            reasonClauseId: null,
            isBacktracked,
            children: [],
            sources,
            hiddenCount: hidden,
        });

        markersCapacity--;
        nodeCount++;
    };

    /** One marker per branch for the first page (up to pageSize), one aggregate for the rest. */
    const emitPage = (
        holder: TreeNode,
        sources: number[],
        isBacktracked: boolean,
    ) => {
        const shown = Math.min(sources.length, pageSize);

        for (let k = 0; k < shown; k++) {
            emitStub(holder, [sources[k]], isBacktracked);
        }

        if (shown < sources.length) {
            emitStub(holder, sources.slice(shown), isBacktracked);
        }
    };

    /** Split a node's children into markers, aggregate if neccesary (fanout) */
    const emitStubs = (
        holder: TreeNode,
        sources: number[],
        isBacktracked: boolean,
    ) => {
        if (sources.length <= fanout) {
            for (const source of sources) {
                emitStub(holder, [source], isBacktracked);
            }
            return;
        }

        emitStub(holder, sources, isBacktracked);
    };

    interface Pending {
        keeper: TreeNode;
        id: number;
        isBacktracked: boolean;
    }

    const enqueueChildren = (
        queue: Pending[],
        keeper: TreeNode,
        id: number,
        isBacktracked: boolean,
    ) => {
        const bucket = bucketOf(id);
        const end = childStart[bucket + 1];

        for (let j = childStart[bucket]; j < end; j++) {
            const child = childList[j];

            // children are in increasing event order, so the rest is in the future
            if (child > step) {
                break;
            }

            queue.push({ keeper, id: child, isBacktracked });
        }
    };

    /**
     * Breadth-first materialization of `seeds` under `holder`, up to capacity.
     *
     * Whatever cannot be drawn becomes a collapsed node, grouped under the parent, where it would have been drawn.
     */
    function grow(holder: TreeNode, seeds: number[], isBacktracked: boolean) {
        const queue: Pending[] = [];

        for (const seed of seeds) {
            queue.push({ keeper: holder, id: seed, isBacktracked });
        }

        for (let q = 0; q < queue.length; q++) {
            const item = queue[q];
            const backtracked =
                item.isBacktracked || removedAt[item.id] <= step;

            // Folded propagations draw nothing, just a counter increase
            if (foldPropagations && isPropagation(item.id)) {
                item.keeper.impliedCount = (item.keeper.impliedCount ?? 0) + 1;
                enqueueChildren(queue, item.keeper, item.id, backtracked);
                continue;
            }

            // budget reached, collapse the rest end stop
            if (capacity <= 0) {
                collapseRest(queue, q);
                return;
            }

            // draw the node, queue its children
            const node = makeNode(item.id, backtracked);
            item.keeper.children.push(node);
            capacity--;
            nodeCount++;

            if (node.kind === "decision") {
                decisionCount++;
            }

            enqueueChildren(queue, node, item.id, backtracked);
        }
    }

    /**
     * groups the unprocessed queue by keeper, creates one aggregate per group
     */
    function collapseRest(queue: Pending[], from: number) {
        const groups = new Map<TreeNode, Pending[]>();

        for (let q = from; q < queue.length; q++) {
            const item = queue[q];
            const group = groups.get(item.keeper);

            if (group) {
                group.push(item);
            } else {
                groups.set(item.keeper, [item]);
            }
        }

        for (const [keeper, group] of groups) {
            emitStub(
                keeper,
                group.map((item) => item.id),
                group.every((item) => item.isBacktracked),
            );
        }
    }

    /**
     * The active scope. Walks the live path from the root and is always drawn.
     * It hangs the abandoned branches off it as markers.
     * A node is live at `step` when it exists and no backtrack has unwound it.
     */
    function growActiveSpine() {
        let keeper = root;
        let cursor = ROOT;

        for (;;) {
            const bucket = bucketOf(cursor);
            const end = childStart[bucket + 1];
            const live: number[] = [];
            const abandoned: number[] = [];

            for (let j = childStart[bucket]; j < end; j++) {
                const child = childList[j];

                if (child > step) {
                    break;
                }

                if (removedAt[child] > step) {
                    live.push(child);
                } else {
                    abandoned.push(child);
                }
            }

            emitStubs(keeper, abandoned, true);

            if (live.length === 0) {
                return;
            }

            // todo: check this: a second live child would need chronological backtracking, so draw it normally
            if (live.length > 1) {
                grow(keeper, live.slice(1), false);
            }

            const next = live[0];

            if (foldPropagations && isPropagation(next)) {
                keeper.impliedCount = (keeper.impliedCount ?? 0) + 1;
            } else {
                const node = makeNode(next, false);
                keeper.children.push(node);
                nodeCount++;
                if (node.kind === "decision") {
                    decisionCount++;
                }
                keeper = node;
            }

            cursor = next;
        }
    }

    if (opts.scope === "active") {
        growActiveSpine();
    } else {
        const bucket = skeleton.rootBucket;
        const seeds: number[] = [];

        for (let j = childStart[bucket]; j < childStart[bucket + 1]; j++) {
            seeds.push(childList[j]);
        }

        grow(root, seeds, false);
    }

    return {
        root,
        scope: opts.scope,
        decisionCount,
        nodeCount,
        hiddenNodeCount: hiddenCount,
    };
}
