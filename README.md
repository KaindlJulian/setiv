# Setiv

**S**AT **E**vent **T**racer and **I**nteractive **V**iewer

[setiv.pages.dev](https://setiv.pages.dev/)


## Overview

| Path                          | Contents                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `event_protocol/`             | The protocol spec, JSON schemas, log generation scripts              |
| `solvers/`                    | `cadical`, `minisat`, `satch` and `setiv-dpll` all patched and written to implement the protocol |
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

Two ways. In the browser, select a dimacs file in the formula input and pick
a solver. It runs as WebAssembly and generates the log. Or build a solver and run:

```bash
python3 solvers/build.py

python3 event_protocol/run_eventlog.py [solver] formulas/php_4_3.cnf
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

An `init` event opens every log with the variable count and the clause database..

Nine events cover the search: `init`, `decide`, `propagate`, `conflict`,
`learn`, `backtrack`, `restart`, `delete_clause`, `result`.

The specification defines the shape of the stream. It does not tell an adapter author which internal sites to
hook or how much of the solver's state to expose. Fields a consumer branches on are a closed set that every solver
can fill in. Everything solver specific, heuristic names or the internal phase
that requested a backtrack, is optional and display only.

See 

- [`event_protocol/solver_event_protocol.md`](event_protocol/solver_event_protocol.md) for the full specification and details on how to implement the protocol for a solver.
- [`event_protocol/json_schemas/solver_event_schema.json`](event_protocol/json_schemas/solver_event_schema.json) for a json schema to validate against.

### Adding a solver

Emit the events at the corresponding points in the solver's search, then run
`replay_check.py` on the output until it passes. The spec's "Implementing an
adapter" section covers the hook points that are easy to get wrong, above all
`backtrack`, which belongs at the solver's internal unwind function and not at
its call sites.

Reference implementations:

- [`solvers/setiv-dpll`](solvers/setiv-dpll), an around 500 lines textbook DPLL solver 
without optimizations. Does not emit all events, because either they are not relevant 
to pure DPLL (e.g. `learn`) or the solver does not implement this behavior (e.g. `restart`). 
- [`solvers/cadical`](solvers/cadical), a fork with the hooks in `src/hooks.cpp`
  behind an abstract `SolverObserver`, so the hook code and the NDJSON writing
  stay separate.
- [`solvers/satch`](solvers/satch), a fork with the hooks in `satch.c` and the
  NDJSON writer in `events.h`. Turns features off at compile
  time, so one source gives two solvers: `satch-cdcl` is CDCL stripped to
  roughly what the protocol describes, and `satch-dpll` is `--no-cdcl`, a pure
  DPLL that resolves a conflict by flipping the last decision instead of
  learning. Both configurations are in `solvers/build.py`.
