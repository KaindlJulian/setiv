import type { SolverRun } from "./run";

/* main datastructure for the chart */
export interface Timeline {
    level: Int32Array;
    conflictSteps: Int32Array;
    restartSteps: Int32Array;
    maxLevel: number;
}

const empty: Timeline = {
    level: new Int32Array(0),
    conflictSteps: new Int32Array(0),
    restartSteps: new Int32Array(0),
    maxLevel: 0,
};

/**
 * single pass over the events
 */
export function buildTimeline(run: SolverRun): Timeline {
    const count = run.events.length;

    if (count === 0) {
        return empty;
    }

    const level = new Int32Array(count);
    const conflictSteps: number[] = [];
    const restartSteps: number[] = [];

    let current = 0;
    let maxLevel = 0;

    for (let i = 0; i < count; i++) {
        const ev = run.events[i];

        switch (ev.event) {
            case "decide":
                current = ev.level;
                break;
            case "backtrack":
                current = ev.to_level;
                break;
            case "conflict":
                conflictSteps.push(i);
                break;
            case "restart":
                restartSteps.push(i);
                break;
            default:
                break;
        }

        level[i] = current;

        if (current > maxLevel) {
            maxLevel = current;
        }
    }

    return {
        level,
        conflictSteps: Int32Array.from(conflictSteps),
        restartSteps: Int32Array.from(restartSteps),
        maxLevel,
    };
}
