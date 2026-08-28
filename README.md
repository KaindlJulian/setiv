# Setiv

**S**AT **E**vent **T**racer and **I**nteractive **V**iewer

A solver emits one JSON object per
search event, and a web app replays that stream step by step: the implication
graph as it grows toward a conflict, the decision tree, the clause database, the
trail, etc.

The stream format is designed as a solver agnostic protocol and can be implemented for any solver.

[setiv.pages.dev](https://setiv.pages.dev/)

## Overview

| Path                          | Contents                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `event_protocol/`             | The protocol spec, JSON schemas, log generation scripts, and a replay checker               |
| `solvers/`                    | Solvers. `cadical` and `setiv-dpll` implement the protocol, the rest are here for reference |
| `formulas/`                   | DIMACS instances used for testing              |
| `web/`                        | The viewer, a preact+vite app                                                    |

## Quick start

To run the viewer locally:

```bash
cd web
npx install
npx run dev
```

### Produce a log

Build the solvers, then run one of the wrapper scripts on a formula:

```bash
bash solvers/build.sh

bash event_protocol/run_cadical_eventlog.sh formulas/php_4_3.cnf
bash event_protocol/run_setiv_dpll_eventlog.sh formulas/php_4_3.cnf
```

Logs land in `event_protocol/out/`.

### The event protocol

One JSON object per line, one line per event. A conflict from
`cadical_trap_3_events.jsonl`, verbatim:

```json
{"event":"decide","literal":11,"level":1,"heuristic":"vmtf"}
{"event":"propagate","literal":10,"level":1,"reason_clause_id":9}
{"event":"conflict","clause_id":10,"literals":[-10,-11],"level":1,"trail":[11,10]}
{"event":"learn","learned_literals":[-11],"glue":0,"clause_id":-1,"jump_level":0}
{"event":"backtrack","from_level":1,"to_level":0,"kind":"conflict","reason":"analyze"}
```

An `init` event opens every log with the variable count and the clause database
the solver is about to search with.

Nine events cover the search: `init`, `decide`, `propagate`, `conflict`,
`learn`, `backtrack`, `restart`, `delete_clause`, `result`. The current version
is `2`, and the viewer rejects anything else.

The spec defines the shape of the stream. It does not tell an adapter author which internal sites to
hook or how much of the solver's state to expose. Fields a consumer branches on are a closed set that every CDCL solver
can fill in. Everything solver specific, heuristic names or the internal phase
that requested a backtrack, is optional and marked display only.

Read [`event_protocol/solver_event_protocol.md`](event_protocol/solver_event_protocol.md)
for the full specification.

### Adding a solver

Emit the events at the corresponding points in the solver's search, then run
`replay_check.py` on the output until it passes. The spec's "Implementing an
adapter" section covers the hook points that are easy to get wrong, above all
`backtrack`, which belongs at the solver's internal unwind function and not at
its call sites.

Two implementations to copy from:

- [`solvers/setiv-dpll`](solvers/setiv-dpll), around 500 lines of Rust, the
  smallest complete example. It skips `learn`, `restart` and `delete_clause`,
  which a DPLL solver has nothing to say about, and still replays correctly.
- [`solvers/cadical`](solvers/cadical), a fork with the hooks in `src/hooks.cpp`
  behind an abstract `SolverObserver`, so the hook code and the NDJSON writing
  stay separate.
