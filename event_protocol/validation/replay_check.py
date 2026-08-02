#!/usr/bin/env python3
"""Check that an event log can be replayed as a pure forward fold.

This is the acceptance test for the backtrack/learn split: it replays the
stream using nothing but the three trail-affecting events, with no
solver-specific inference, and checks the result against the oracle carried in
the log itself.

    decide     -> append literal at event.level
    propagate  -> append literal at event.level
    backtrack  -> keep entries with level <= to_level (stable filter), drop rest
    everything else -> no trail effect

Oracles:
  - every conflict.trail snapshot must equal the replayed trail, in order
  - on SAT, result.model must equal the final trail
  - backtrack.from_level must equal the replayed decision level (this is the
    one that catches a solver adapter missing an unwind site)

Usage:
    python3 event_protocol/replay_check.py out/*.jsonl
    python3 event_protocol/replay_check.py ../web/public/samples/*.jsonl
"""
import json
import sys
from collections import Counter


def check(path, verbose=True):
    trail = []  # (literal, level), in assignment order
    level = 0
    assigned = {}  # variable -> literal, to catch double assignment
    errs = []
    stats = Counter()
    conflicts = 0
    result = model = None
    n = 0

    for n, line in enumerate(open(path), 1):
        line = line.strip()
        if not line:
            continue
        e = json.loads(line)
        ev = e["event"]
        stats[ev] += 1

        if ev in ("decide", "propagate"):
            lit = e["literal"]
            if ev == "decide":
                if e["level"] != level + 1:
                    errs.append(f"line {n}: decide at level {e['level']}, "
                                f"but replay is at level {level}")
                level = e["level"]
            elif e["level"] > level:
                errs.append(f"line {n}: propagate at level {e['level']} "
                            f"above current level {level}")
            if abs(lit) in assigned:
                errs.append(f"line {n}: {lit} assigned while "
                            f"{assigned[abs(lit)]} is still on the trail")
            assigned[abs(lit)] = lit
            trail.append((lit, e["level"]))

        elif ev == "backtrack":
            if e["from_level"] != level:
                errs.append(f"line {n}: backtrack from_level {e['from_level']} "
                            f"but replay is at level {level} "
                            f"(an unwind site is probably unhooked)")
            if e["to_level"] >= e["from_level"]:
                errs.append(f"line {n}: backtrack {e['from_level']}->"
                            f"{e['to_level']} is not a descent")
            if e.get("kind") not in ("conflict", "restart", "other"):
                errs.append(f"line {n}: backtrack kind {e.get('kind')!r} is "
                            f"not one of conflict/restart/other")
            level = e["to_level"]
            keep = [(l, lv) for l, lv in trail if lv <= level]
            for l, lv in trail:
                if lv > level:
                    del assigned[abs(l)]
            trail = keep
            stats["  kind:" + str(e.get("kind"))] += 1
            stats["  reason:" + e.get("reason", "(none)")] += 1

        elif ev == "conflict":
            conflicts += 1
            if e["level"] != level:
                errs.append(f"line {n}: conflict at level {e['level']} "
                            f"but replay is at level {level}")
            got = [l for l, _ in trail]
            if got != e["trail"]:
                errs.append(f"line {n}: trail mismatch\n"
                            f"      expected {e['trail']}\n"
                            f"      replayed {got}")

        elif ev == "result":
            result, model = e["result"], e["model"]
            break  # events after result are not a trail concern

    if result == "sat" and sorted(l for l, _ in trail) != sorted(model):
        errs.append(f"result.model has {len(model)} literals but the final "
                    f"trail has {len(trail)}")

    ok = not errs
    name = path.replace("\\", "/").rsplit("/", 1)[-1]
    print(f"{'PASS' if ok else 'FAIL'}  {name:34s} "
          f"events={n:<7d} conflicts={conflicts:<5d} result={result}")
    if verbose:
        kinds = {k.strip()[5:]: v for k, v in sorted(stats.items())
                 if k.startswith("  kind:")}
        reasons = {k.strip()[7:]: v for k, v in sorted(stats.items())
                   if k.startswith("  reason:")}
        if kinds:
            print(f"        backtracks by kind:   {kinds}")
            print(f"        (reason, display only): {reasons}")
    for m in errs[:10]:
        print("   !! " + m)
    if len(errs) > 10:
        print(f"   !! ... and {len(errs) - 10} more")
    return ok


if __name__ == "__main__":
    paths = sys.argv[1:]
    if not paths:
        print(__doc__)
        sys.exit(2)
    sys.exit(0 if all([check(p) for p in paths]) else 1)
