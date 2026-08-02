import { describe, expect, it } from "vitest";
import type { SolverEvent } from "./events";
import type { TreeNode } from "./decisionTree";
import { buildRun, isChronologicalBackjump } from "./run";
import { replayTo } from "./trail";

function init(variables: number): SolverEvent {
    return {
        event: "init",
        protocol_version: 2,
        variables,
        clauses: 0,
        variable_ids: Array.from({ length: variables }, (_, i) => i + 1),
        clause_list: [],
    };
}

function flatten(node: TreeNode, out: TreeNode[] = []): TreeNode[] {
    out.push(node);

    for (const child of node.children) {
        flatten(child, out);
    }

    return out;
}

function nodeFor(root: TreeNode, lit: number): TreeNode {
    const found = flatten(root).find((n) => n.lit === lit);

    if (!found) {
        throw new Error(`no tree node for literal ${lit}`);
    }

    return found;
}

describe("non-monotonic trail levels", () => {
    // x3 is implied at level 1 while the solver stands at level 2, so the trail
    // reads 1@1, 2@2, 3@1, 4@3 — the case that makes suffix truncation wrong.
    const events: SolverEvent[] = [
        init(6),
        { event: "decide", literal: 1, level: 1 },
        { event: "decide", literal: 2, level: 2 },
        {
            event: "propagate",
            literal: 3,
            level: 1,
            reason_clause_id: 10,
            reason_literals: [3, -1],
        },
        { event: "decide", literal: 4, level: 3 },
        {
            event: "conflict",
            clause_id: 11,
            literals: [-4, -2],
            level: 3,
            trail: [1, 2, 3, 4],
        },
        {
            event: "learn",
            learned_literals: [-1],
            glue: 1,
            clause_id: 12,
            jump_level: 1,
        },
        {
            event: "backtrack",
            from_level: 3,
            to_level: 1,
            kind: "conflict",
            reason: "analyze",
        },
    ];

    const run = buildRun(events);

    it("unwinds by level rather than by position", () => {
        const state = replayTo(run, events.length - 1);

        // Truncating at the first entry above to_level would drop 3@1 too.
        expect(state.trail.map((e) => e.lit)).toEqual([1, 3]);
        expect(state.decisionLevel).toBe(1);
    });

    it("parents a node by level, not by the trail tail", () => {
        const root = run.tree.root;

        // 3@1 was assigned after 2@2, but it is not implied by it.
        expect(nodeFor(root, 1).children.map((n) => n.lit)).toContain(3);
        expect(nodeFor(root, 2).children).toEqual([]);
    });

    it("abandons only what the unwind actually undid", () => {
        const root = run.tree.root;

        expect(nodeFor(root, 3).isBacktracked).toBe(false);
        expect(nodeFor(root, 1).isBacktracked).toBe(false);
        expect(nodeFor(root, 2).isBacktracked).toBe(true);
        expect(nodeFor(root, 4).isBacktracked).toBe(true);
    });
});

describe("conflict pairing", () => {
    const events: SolverEvent[] = [
        init(4),
        { event: "decide", literal: 1, level: 1 },
        { event: "decide", literal: 2, level: 2 },
        // Conflict 1: resolved by a learned clause, but the solver returns to
        // level 1 rather than the clause's jump level of 0.
        {
            event: "conflict",
            clause_id: 11,
            literals: [-1, -2],
            level: 2,
            trail: [1, 2],
        },
        {
            event: "learn",
            learned_literals: [-1],
            glue: 1,
            clause_id: 12,
            jump_level: 0,
        },
        {
            event: "backtrack",
            from_level: 2,
            to_level: 1,
            kind: "conflict",
            reason: "chrono",
        },
        {
            event: "propagate",
            literal: 3,
            level: 1,
            reason_clause_id: 12,
            reason_literals: [3, -1],
        },
        // Conflict 2: no learn follows, and the only unwind afterwards belongs
        // to a restart.
        {
            event: "conflict",
            clause_id: 13,
            literals: [-3],
            level: 1,
            trail: [1, 3],
        },
        { event: "restart", count: 1 },
        {
            event: "backtrack",
            from_level: 1,
            to_level: 0,
            kind: "restart",
            reason: "restart",
        },
        { event: "result", result: "unsat", model: [] },
    ];

    const run = buildRun(events);
    const [first, second] = run.conflicts;

    it("attributes the learned clause and the unwind separately", () => {
        expect(first.learnedLiterals).toEqual([-1]);
        expect(first.jumpLevel).toBe(0);
        expect(first.backtrackLevel).toBe(1);
        expect(isChronologicalBackjump(first)).toBe(true);
    });

    it("leaves a conflict resolved without a learned clause unpaired", () => {
        expect(second.learnedLiterals).toBeNull();
        expect(second.jumpLevel).toBeNull();
    });

    it("does not credit a restart's unwind to the pending conflict", () => {
        expect(second.backtrackLevel).toBeNull();
    });

    it("counts every event kind", () => {
        expect(run.stats.conflicts).toBe(2);
        expect(run.stats.learned).toBe(1);
        expect(run.stats.backtracks).toBe(2);
        expect(run.stats.restarts).toBe(1);
        expect(run.stats.decisions).toBe(2);
    });
});
