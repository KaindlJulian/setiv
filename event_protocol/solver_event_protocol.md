# Solver Event Protocol

A solver agnostic NDJSON event stream for CDCL event extraction.

## New Line Delimited JSON Format (NDJON)

Each event is a single JSON object on its own line. In other words, objects are delimited by newlines.
If solvers interleave their own output, its always using prefixed lines
(`c ...`, `s ...`). The ouput lines of this NDJSON log are starting with `{`, should be unambiguously extractable
with:

```bash
./solver --hooks input.cnf | grep '^{'
```

Further, the Protocol is not really concerned with how the JSON is serialized, as long as it is valid with respect to the following schema.

---

## Conventions

- **Decision levels** positive integers, 0-based.
- **Literals** are signed integers: positive = variable true, negative = variable false. Variables are numbered `1..N`.
- **Clause IDs** are monotonically increasing `int64` values assigned at clause creation. `-1` means "no permanent clause object" (e.g. a learned clause).
- Run the solver with preprocessing disabled for the cleanest stream. The`init` event captures the complete problem state before any clause is added or removed.

---

## Events

### `init`

Fired once before the CDCL loop begins.

```json
{"event":"init","protocol_version":2,"variables":N,"clauses":M,"variable_ids":[1,...,N],"clause_list":[{"id":CID,"literals":[...]}, ...]}
```

| Field              | Type     | Description                                        |
| ------------------ | -------- | -------------------------------------------------- |
| `protocol_version` | int      | Version of the protocol                            |
| `variables`        | int      | Number of variables                                |
| `clauses`          | int      | Number of initial clauses                          |
| `variable_ids`     | int[]    | All variable indices, `1` through `N`              |
| `clause_list`      | object[] | Each entry has `id` (int64) and `literals` (int[]) |

`protocol_version` is the current version of this document, `2`. It is
the first field of the first event precisely so that a consumer can fail
 instead of misparsing the stream.

Adapters emit the version they were written against.

| Version | Change                                                             |
| ------- | ------------------------------------------------------------------ |
| `1`     | Initial format, with a combined `learn_and_backtrack` event        |
| `2`     | `learn_and_backtrack` split into separate `learn` and `backtrack`  |

The version describes this NDJSON format only. It says nothing about any
particular adapters internals.

---

### `decide`

Fired after a decision literal is committed to the trail and the decision level is incremented.

```json
{"event":"decide","literal":L,"level":DL,"heuristic":"vsids"}
```

| Field       | Type   | Description                                                    |
| ----------- | ------ | -------------------------------------------------------------- |
| `literal`   | int    | The decided literal                                            |
| `level`     | int    | The new decision level                                         |
| `heuristic` | string | *Optional.* Which decision heuristic picked it; display only   |

`heuristic` is free-form and solver-specific (CaDiCaL emits `vsids`, `vmtf`, or
`random`). Like `backtrack.reason` it exists for display; consumers must not
branch on it, and adapters may omit it.

---

### `propagate`

Fired for each BCP-implied assignment. Not fired for decisions or external propagations.

```json
{"event":"propagate","literal":L,"level":DL,"reason_clause_id":CID|null,"reason_literals":[...]}
```

| Field              | Type          | Description                                                  |
| ------------------ | ------------- | ------------------------------------------------------------ |
| `literal`          | int           | The propagated literal                                       |
| `level`            | int           | **Assignment level** of the literal — see below              |
| `reason_clause_id` | int64 or null | ID of the antecedent clause; `null` for root-level units     |
| `reason_literals`  | int[]         | Literals of the antecedent clause; `[]` for root-level units |

`level` is the level at which the literal is *implied* — the highest level
among the other literals of its antecedent clause — **not** the decision level
in force when it was assigned. The two are the same in a classical CDCL solver,
so an adapter for one can simply report the current decision level.

Under chronological backtracking they differ, and `level` may be **lower** than
the current decision level: a clause becomes unit because of literals well below
the top of the trail, and the implied literal belongs at their level. It is
routine, not an edge case — 25,007 of `prime65537`'s 767,725 propagations. This
is exactly what makes trail levels non-monotonic, and why `backtrack` is applied
as a stable filter rather than a truncation.

A consumer must therefore take each literal's level from this field and never
from a running "current level" counter.

---

### `conflict`

Fired at the start of conflict analysis, before the trail is modified. Also fired when a conflict is detected at decision level 0, immediately before `result: "unsat"` — in that case no `learn` follows, and `level: 0` unambiguously signals that the empty clause was derived.

```json
{"event":"conflict","clause_id":CID,"literals":[...],"level":DL,"trail":[...]}
```

| Field       | Type  | Description                                   |
| ----------- | ----- | --------------------------------------------- |
| `clause_id` | int64 | ID of the falsified clause                    |
| `literals`  | int[] | Literals of the falsified clause              |
| `level`     | int   | Decision level when the conflict was detected |
| `trail`     | int[] | All assigned literals in assignment order     |

The `trail` snapshot makes conflict analysis reconstruction stateless: a
consumer does not need to replay preceding `propagate` and `backtrack` events
to know which literals are currently assigned. It is redundant with a correct
replay of those events and exists mainly as a cross-check.

`trail` gives the node set only, not the implication graph's edges. To
reconstruct the graph (and replay the 1st-UIP cut), a consumer must also
cache `reason_clause_id`/`reason_literals` from each `propagate` event,
keyed by literal, as the stream is consumed — `decide` events mark their
literal as a node with no incoming edges. The `conflict` event's own
`clause_id`/`literals` form the synthetic top node; its incoming edges are
the negated literals of the falsified clause. Walking backward from that
node through the cached reason edges, restricted to the current decision
level, is the 1st-UIP algorithm itself. If only the resulting learned
clause is needed (not an animation of the resolution steps), `learned_literals`
in the following `learn` event already provides it.

When `level == 0`, conflict analysis is skipped and the empty clause is derived
immediately. No `learn` event follows; the next event is `result: "unsat"`.

A `conflict` above level 0 is also not guaranteed to be followed by a `learn`.
A solver may resolve a conflict by backtracking and directly assigning a forced
literal rather than deriving a 1st-UIP clause. In that case the `conflict` is
followed by a `backtrack` and then a `propagate`. Consumers must not treat
`learn` as the mandatory successor of `conflict`.

---

### `learn`

Fired after the 1st-UIP clause is derived.

This event reports a **clause**, not a trail change. The unwind that follows it
is reported separately, by the next `backtrack` event.

```json
{"event":"learn","learned_literals":[...],"glue":G,"clause_id":CID,"jump_level":JL}
```

| Field              | Type  | Description                                                          |
| ------------------ | ----- | -------------------------------------------------------------------- |
| `learned_literals` | int[] | Literals of the 1st-UIP learned clause                               |
| `glue`             | int   | LBD (Literal Block Distance) of the learned clause                   |
| `clause_id`        | int64 | ID of the new clause; `-1` for learned unit clauses                  |
| `jump_level`       | int   | Raw jump level (second-highest decision level in the learned clause) |

`jump_level` is a property of the learned clause. The level the solver actually
returns to is `to_level` on the following `backtrack`, and the two differ under
chronological backtracking (on `prime529`, 10 of 45 learns). Consumers wanting
"was this backjump chronological?" compare the two across the event pair.

---

### `backtrack`

Fired before every trail unwind, whatever caused it, and **only** when
something is actually unwound (`to_level < from_level`).

```json
{"event":"backtrack","from_level":FL,"to_level":TL,"kind":"conflict","reason":"otfs"}
```

| Field        | Type   | Description                                                |
| ------------ | ------ | ---------------------------------------------------------- |
| `from_level` | int    | Decision level before the unwind                           |
| `to_level`   | int    | Decision level after the unwind                            |
| `kind`       | string | Closed enum; the **only** field a consumer may branch on   |
| `reason`     | string | *Optional.* Free-form detail, display and debugging only   |

The event deliberately does **not** list the unassigned literals: that would
cost O(trail) bytes per backtrack. `to_level` is sufficient, because a consumer
already knows each assigned literal's level from the `decide`/`propagate` event
that introduced it.

To apply a `backtrack`, **keep every trail entry whose level is `<= to_level`,
in its existing order, and drop the rest.** Do not truncate the trail at the
first entry above `to_level`. Under chronological backtracking trail levels are
not monotonic — a literal at level 23 can legitimately sit after a literal at
level 29 — so suffix truncation removes the wrong entries.

#### `kind` — the closed classification

| Value      | Meaning                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------- |
| `conflict` | The unwind resolves a conflict: a backjump after analysis, a chronological unwind taken before analysis, or on-the-fly subsumption |
| `restart`  | The unwind belonging to a `restart` marker                                                   |
| `other`    | Everything else: inprocessing, preprocessing, incremental API, cleanup                       |

Three values, because these are the distinctions that exist in **every** CDCL
solver. A consumer written against them keeps working against a new adapter
without changes. This set is closed: adapters must not invent values, and a
consumer may treat an unknown one as a malformed log.

Classifying is the **adapter's** job, not the consumer's. This is the whole
point of splitting the field: a mature solver unwinds from dozens of internal
phases with names that mean nothing outside that codebase, and a viewer must
never have to learn them in order to answer "does this backtrack belong to the
conflict I am displaying?".

Note that `kind: "conflict"` does **not** imply the unwind sits between a
`conflict` event and the next one — a chronological unwind is taken *before*
the conflict is reported. Pair by proximity, not by assuming an order.

#### `reason` — optional detail

Free-form text naming the solver-internal phase that requested the unwind
(CaDiCaL emits `analyze`, `chrono`, `otfs`, `restart`, `vivify`, `reduce`, and
about twenty more). It exists for tooltips and for debugging an adapter's hook
coverage.

**Consumers must never branch on `reason`.** Adapters may omit it entirely,
change their vocabulary between versions, or use names no other solver uses.
Anything a consumer needs in order to behave correctly belongs in `kind`.

---

### `restart`

A marker, fired when the solver decides to restart. It carries no level
information and implies no trail change.

The restart's unwind arrives as a separate `backtrack` with
`kind: "restart"`. That `backtrack` is **absent** when trail reuse leaves the
decision level unchanged, which is common — on `prime65537`, only 92 of 177
restarts actually unwind anything.

```json
{"event":"restart","count":N}
```

| Field   | Type  | Description                               |
| ------- | ----- | ----------------------------------------- |
| `count` | int64 | Total restart count (already incremented) |

---

### `delete_clause`

Fired before a clause is freed during garbage collection.

```json
{"event":"delete_clause","clause_id":CID,"literals":[...]}
```

| Field       | Type  | Description                             |
| ----------- | ----- | --------------------------------------- |
| `clause_id` | int64 | ID of the clause being deleted          |
| `literals`  | int[] | Literals of the clause at deletion time |

Consumers that track the active clause database must process this event to
remove clauses that the solver has discarded. Without it, learned clauses
deleted during clause reduction will appear active indefinitely.

---

### `result`

Fired immediately after the CDCL loop returns.

```json
{"event":"result","result":"sat"|"unsat"|"unknown","model":[...]}
```

| Field    | Type   | Description                                                                                       |
| -------- | ------ | ------------------------------------------------------------------------------------------------- |
| `result` | string | `"sat"`, `"unsat"`, or `"unknown"`                                                                |
| `model`  | int[]  | For SAT: one literal per variable (positive if true, negative if false). Empty for UNSAT/unknown. |

---

## Semantic vs. informational fields

Not every field carries the same weight, and an adapter author should know which
ones they cannot get wrong.

**Semantic** — a consumer's reconstruction is wrong if these are wrong. Get
these right first:

`decide.literal/level`, `propagate.literal/level/reason_clause_id/reason_literals`,
`backtrack.from_level/to_level/kind`, `conflict.clause_id/literals/level/trail`,
`learn.learned_literals/clause_id`, `delete_clause.clause_id`, `result.result/model`,
and all of `init`.

**Informational** — display and diagnostics only. Nothing in a correct consumer
should depend on them, and each is either derivable from the semantic fields or
a solver-specific heuristic value:

| Field            | Why it is informational                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `learn.glue`     | LBD is a heuristic quality metric, not part of CDCL semantics. A solver that does not compute it may report `0`. |
| `learn.jump_level` | Derivable: the second-highest level among `learned_literals`. Useful only to compare against the following `backtrack.to_level`. |
| `backtrack.reason` | Solver-internal phase name; see the `backtrack` section.                 |
| `restart.count`  | Derivable by counting `restart` events.                                     |
| `decide.heuristic` | Names the decision heuristic (`vsids`, `vmtf`, `random`, ...). Entirely solver-specific. |

A minimal adapter can omit or stub every informational field and still produce a
log this protocol's consumers handle correctly.

---

## Reconstructing the trail

Three events change the trail, and nothing else does. Replaying a prefix of the
stream is a plain forward fold with no lookahead:

| Event       | Effect                                                          |
| ----------- | --------------------------------------------------------------- |
| `decide`    | append `literal` at `level`                                     |
| `propagate` | append `literal` at `level`                                     |
| `backtrack` | keep entries with level `<= to_level` in order, drop the rest   |
| all others  | no trail effect                                                 |

The decision level is likewise `decide.level` going up and `backtrack.to_level`
coming down.

A consumer must **not** infer trail changes from any other event — for example,
treating a `decide` at level `L` as evidence that the trail must first be
unwound to `L-1`, or treating a `conflict` as implying that analysis has already
backtracked. Such rules are fitted to one solver's control flow. They do not
fail loudly on another solver; they produce a plausible wrong trail.

Two invariants a consumer can assert, and which the samples in
`event_protocol/out/` satisfy for every event:

- at each `conflict`, the replayed trail equals the event's `trail` snapshot
  exactly, including order;
- at each `backtrack`, `from_level` equals the consumer's current level.

The second is the useful one to keep as a runtime check: it catches a solver
adapter that has missed an unwind site, which is otherwise invisible.

`event_protocol/replay_check.py` implements this fold and both assertions, and
is the acceptance test for a new adapter:

```bash
python3 event_protocol/replay_check.py path/to/events.jsonl
```

---

## Implementing an Adapter

To adapt a new solver, implement the `SolverObserver` abstract interface
(`solvers/SolverObserver.hpp`) and inject calls at the corresponding solver
hook points:

| Event           | Hook point                                                                          |
| --------------- | ----------------------------------------------------------------------------------- |
| `init`          | Entry of the CDCL loop, after parsing/preprocessing                                 |
| `decide`        | After the decision literal is assigned                                              |
| `propagate`     | After each BCP-implied literal is assigned                                          |
| `conflict`      | At the start of conflict analysis; also at level 0 before UNSAT (no `learn` follows) |
| `learn`         | After the 1st-UIP clause is derived, before backtracking                            |
| `backtrack`     | Before **every** trail unwind — see below                                           |
| `restart`       | When the solver decides to restart                                                  |
| `delete_clause` | Before a clause is freed                                                            |
| `result`        | After the solver returns                                                            |

**`backtrack` must be hooked at the solver's internal unwind chokepoint, not at
its call sites.** Mature CDCL solvers backtrack from far more places than the
search loop: CaDiCaL has 46 `backtrack()` call sites across 22 files, and only
the analysis and restart ones are part of the search loop proper. Hooking call
sites individually means the ones you miss silently produce a plausible but
wrong trail in every consumer, which is the hardest failure mode to notice.
Every solver in this family funnels unwinding through one function (CaDiCaL:
`Internal::backtrack_without_updating_phases`) because unassignment has to be
centralised for the variable-order heuristics; hook that.

The same argument applies to `propagate`, which is hooked in CaDiCaL's
`search_assign()` rather than at its callers.

Fire the hook **before** the trail is modified, so the pre-unwind decision
level is still readable, and place it after the solver's own no-op early
return so that `to_level < from_level` always holds.

Because one chokepoint serves every phase, the chokepoint itself cannot tell
*why* it was called. Pass the caller's identity in — CaDiCaL uses a defaulted
`const char *reason` parameter on `backtrack()`, which leaves existing call
sites compiling unchanged and cannot desynchronise the way a member variable
would. **Classifying that into `kind` is the adapter's obligation**, and it
should happen in exactly one function so the solver's vocabulary never reaches
a consumer (CaDiCaL: `backtrack_kind()` in `hooks.cpp`).

Pass an `NdjsonObserver` instance (`solvers/NdjsonObserver.hpp`) as the
concrete observer to produce the NDJSON stream without writing any
serialization code in the adapter itself.
