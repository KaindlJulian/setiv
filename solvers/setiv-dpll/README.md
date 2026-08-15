# setiv-dpll

A small DPLL solver that implements the [Solver Event Protocol](../../event_protocol/solver_event_protocol.md) and emits a NDJSON log.

```bash
cargo build --release
./target/release/setiv-dpll ../../formulas/php_4_3.cnf                    # result only
./target/release/setiv-dpll --events out.jsonl ../../formulas/e3220.cnf   # with a log
```

## How the protocol is implemented

| Event | Emitted | Note |
| ----- | ------- | ---- |
| `init` | yes | clause ids are 1-based |
| `decide` | yes | `heuristic` is `first-unassigned` |
| `propagate` | yes | `reason_clause_id` is `null` for a pure literal or a free variable |
| `backtrack` | yes | always `kind: "conflict"`, `reason` is `failed-branch` |
| `learn` | no | |
| `restart` | no | |
| `delete_clause` | no | |
| `result` | yes | the model is the full trail |

## Four places DPLL reads differently from CaDiCaL

These are the interesting output of the exercise, and all four are places where
a consumer written only against the CaDiCaL logs could be wrong.

**1. Both branches are a `decide`.** `DPLL(F ∧ {l})` failing produces a
`backtrack` to `level-1` followed by a `decide` of `¬l` back at `level` — the
second recursive call, not a flipped version of the first. Nothing implies
either literal, so the decision tree shows two children per node, which is the
shape DPLL is usually drawn in.

**2. UNSAT usually arrives with no level-0 conflict.** CaDiCaL ends an
unsatisfiable run by deriving the empty clause, so its last two events are a
`conflict` at `level: 0` and then `result: "unsat"`. DPLL has no resolution and
cannot derive an empty clause: it reports UNSAT because the search space is
exhausted. The run ends with a conflict at whatever level it happened at, the
chain of `backtrack`s that unwinds the failed branches back to 0, and
`result: "unsat"`.

The level-0 conflict path still exists here — it is how `root_conflict`-shaped
inputs and any formula whose root propagation is contradictory end, and it is
terminal in exactly the way the protocol describes. But a consumer must not
treat "conflict at level 0" as the *definition* of UNSAT, and must not assume the
trail is empty when `result` arrives unless it processed the final `backtrack`.

**3. Root-level propagations carry a real `reason_clause_id`.** The protocol
allows `null` there and CaDiCaL emits `null`, because it discards a unit
clause's antecedent. This solver never discards anything, so it names the actual
unit clause. Both are legal; a consumer must handle the id being present.

**4. Pure literals are `propagate` with `reason_clause_id: null`, at any
level.** Pure literal elimination has no CDCL counterpart: the assignment is
forced in the sense that the search never has to revisit it, but no clause
implies it, so there is no antecedent to name. `propagate` is the closer fit of
the two trail-affecting events — reporting it as a `decide` would claim a branch
point with an untried sibling, which is false and would corrupt a decision-tree
view. The same applies to variables left free when `F` empties out: the model
needs one literal per variable, so they are assigned and logged the same way.

A consequence worth knowing before using these logs as teaching material: pure
literal elimination is strong enough to erase the search entirely on small
formulas. `e3220` now solves with **zero decisions and zero conflicts** — every
variable is fixed by pure literals — so its decision tree is a single node.
CaDiCaL, which does not do pure literal elimination, still branches on it.
