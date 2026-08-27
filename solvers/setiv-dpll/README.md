# setiv-dpll

A small DPLL solver that implements the [Solver Event Protocol](../../event_protocol/solver_event_protocol.md) and emits a NDJSON log.

```bash
cargo build --release
./target/release/setiv-dpll ../../formulas/php_4_3.cnf
./target/release/setiv-dpll --events out.jsonl ../../formulas/php_4_3.cnf   # save the event log to out.jsonl
```

## How the protocol is implemented

| Event | Emitted | Note |
| ----- | ------- | ---- |
| `init` | yes | |
| `decide` | yes | `heuristic` is `first-unassigned` |
| `propagate` | yes |  |
| `conflict` | yes |  |
| `backtrack` | yes | always `kind: "conflict"`, `reason` is `failed-branch` |
| `learn` | no | |
| `restart` | no |  |
| `delete_clause` | no | |
| `result` | yes |  |
