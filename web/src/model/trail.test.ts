import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SUPPORTED_PROTOCOL_VERSION } from "./events";
import { parseEventLog } from "./parse";
import { buildRun } from "./run";
import { replayTo } from "./trail";

const samples = [
    "cadical_full_2_events.jsonl",
    "cadical_e3220_events.jsonl",
    "cadical_php_3_2_events.jsonl",
    "cadical_php_4_3_events.jsonl",
    "cadical_prime529_events.jsonl",
];

function load(name: string) {
    const path = new URL(`../../public/samples/${name}`, import.meta.url);
    const parsed = parseEventLog(readFileSync(path, "utf8"));

    return { parsed, run: buildRun(parsed.events) };
}

describe.each(samples)("%s", (name) => {
    const { parsed, run } = load(name);

    it("parses as protocol v2 with no unreadable lines", () => {
        expect(parsed.issues).toEqual([]);
        expect(parsed.protocolVersion).toBe(SUPPORTED_PROTOCOL_VERSION);
        expect(run.events.length).toBeGreaterThan(0);
    });

    it("enters every backtrack at the level the log says it does", () => {
        let level = 0;

        for (const ev of run.events) {
            if (ev.event === "decide") {
                level = ev.level;
            } else if (ev.event === "backtrack") {
                expect(ev.from_level).toBe(level);
                level = ev.to_level;
            }
        }
    });

    it("reproduces every conflict.trail snapshot, in order", () => {
        expect(run.conflicts.length).toBeGreaterThanOrEqual(0);

        for (const conflict of run.conflicts) {
            const replayed = replayTo(run, conflict.eventIndex).trail.map(
                (entry) => entry.lit,
            );

            expect(replayed, `conflict #${conflict.index}`).toEqual(
                conflict.trail,
            );
        }
    });

    it("never holds a variable under both polarities", () => {
        const steps = [
            ...run.conflicts.map((c) => c.eventIndex),
            run.events.length - 1,
        ];

        for (const step of steps) {
            const { trail } = replayTo(run, step);
            const variables = new Set(
                trail.map((entry) => Math.abs(entry.lit)),
            );

            expect(variables.size, `step ${step}`).toBe(trail.length);
        }
    });

    it("ends on a trail matching result.model", () => {
        if (run.result?.result !== "sat") {
            return;
        }

        const final = replayTo(run, run.events.length - 1).trail.map(
            (entry) => entry.lit,
        );

        expect([...final].sort((a, b) => a - b)).toEqual(
            [...run.result.model].sort((a, b) => a - b),
        );
    });
});
