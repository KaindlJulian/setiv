# Solver Event Protocol
Version: 3

A solver agnostic NDJSON event stream for CDCL event extraction.

## Scope of this document

This document specifies the shape of the stream. Which events exist, which
fields they carry, what those fields mean, and the few rules a consumer may rely
on when it replays a log.

It does not specify what a given solver should put into those fields. The protocol 
guarantees two things: a log is well formed and parsable, and the semantics marked 
below as required hold. Everything else is up to the implementation.

In the following
- "adapter" is an implementation of this protocol for a SAT solver.
- "consumer" is in particular the web-based logviewer in `web/`, but theoretically any application that processes the protocol logs in any way. 

## Newline delimited JSON format (NDJSON)

Each event is a single JSON object on a new line. In other words, objects are
delimited by newlines.

The protocol does not care how the JSON is serialized or formatted, as long as
it is valid NDJSON and valid against the schemas in `event_protocol/json_schemas/`.


## Conventions

- **Decision levels** positive integers, 0-based.
- **Literals** are signed integers: positive = variable true, negative = variable false. Variables are numbered `1..N`.
- **Clause IDs** are integer values assigned at clause creation and unique for the lifetime of the run. `-1` means "no permanent clause object", for example a learned unit clause.
- Fields marked *optional* may be omitted entirely. Unknown fields are not allowed, the schemas reject them.


## Events

### `init`

Fire once, before the CDCL loop begins. This event establishes the variable and
clause universe that later events refer to.

```json
{"event":"init","protocol_version":"3","variables":N,"clauses":M,"variable_ids":[1,...,N],"clause_list":[{"id":CID,"literals":[...]}, ...]}
```

| Field              | Type     | Description                                        |
| ------------------ | -------- | -------------------------------------------------- |
| `protocol_version` | string   | Version of the protocol the adapter was written against |
| `variables`        | int      | Number of variables                                |
| `clauses`          | int      | Number of clauses in `clause_list`                 |
| `variable_ids`     | int[]    | Variable indices                                   |
| `clause_list`      | object[] | Each entry has `id` (int64) and `literals` (int[]) |

What ends up in `clause_list` is the adapter's decision. It is whatever clause
database the solver is about to search with, which may not match the input. 
The protocol asks only that the event is self-consistent:

- `clauses` equals the length of `clause_list`,
- ids in `clause_list` are the same ids later events use for those clauses,
- any assignment the solver already holds when search begins arrives as an
  event, a root-level `propagate`, rather than sitting implicit in `init`.

---

### `decide`

Fire after the solver commits a decision literal to the trail and increments the
decision level.

```json
{"event":"decide","literal":L,"level":DL,"heuristic":"vsids"}
```

| Field       | Type   | Description                                                    |
| ----------- | ------ | -------------------------------------------------------------- |
| `literal`   | int    | The decided literal                                            |
| `level`     | int    | The new decision level                                         |
| `heuristic` | string | *Optional.* Which decision heuristic picked it, display only   |

`heuristic` is free-form and solver-specific, exists purely for display information.

---

### `propagate`

Fire for each BCP-implied assignment. Not for decisions.

```json
{"event":"propagate","literal":L,"level":DL,"reason_clause_id":CID|null,"reason_literals":[...]}
```

| Field              | Type          | Description                                                  |
| ------------------ | ------------- | ------------------------------------------------------------ |
| `literal`          | int           | The propagated literal                                       |
| `level`            | int           | Assignment level of the literal, see below                   |
| `reason_clause_id` | int64 or null | ID of the antecedent clause, `null` for root-level units     |
| `reason_literals`  | int[]         | *Optional.* Literals of the antecedent clause, `[]` for root-level units |

---

### `conflict`

Fire at the start of conflict analysis, before anything modifies the trail. Fire
it also for a conflict at decision level 0, immediately before
`result: "unsat"`.

```json
{"event":"conflict","clause_id":CID,"literals":[...],"level":DL,"trail":[...]}
```

| Field       | Type  | Description                                   |
| ----------- | ----- | --------------------------------------------- |
| `clause_id` | int64 | ID of the falsified clause                    |
| `literals`  | int[] | Literals of the falsified clause              |
| `level`     | int   | Decision level when the solver hit the conflict |
| `trail`     | int[] | A trail snapshot. All assigned literals in assignment order     |

The `trail` snapshot makes conflict analysis stateless to reconstruct. A
consumer does not have to replay the preceding `propagate` and `backtrack`
events to know which literals are assigned. It duplicates a correct replay of
those events and mostly earns its bytes as a cross-check.

`trail` gives the node set, not the implication graph's edges. To rebuild the
graph and replay the 1st-UIP cut, a consumer also caches `reason_clause_id` from
each `propagate` event, keyed by literal, as it consumes the stream, then
resolves each id against the clause database. Literals from `decide` events are
nodes with no incoming edges. The `conflict` event's own `clause_id` and
`literals` form the synthetic top node, and its incoming edges are the negated
literals of the falsified clause. A consumer that wants only the learned clause,
not an animation of the resolution steps, can read `learned_literals` off the
following `learn` event instead.

Two rules about what may follow a `conflict`:

- When `level == 0` the solver has derived the empty clause. No `learn` follows,
  the next event is `result: "unsat"`.
- Above level 0, a `learn` is still not guaranteed. A solver may resolve a
  conflict by backtracking and assigning a forced literal directly instead of
  deriving a 1st-UIP clause, in which case a `backtrack` and then a `propagate`
  follow. Consumers must not treat `learn` as the mandatory successor of
  `conflict`.

---

### `learn`

Fire after conflict analysis derives a clause.

This event reports a clause, not a trail change. The unwind that follows it has
its own `backtrack` event.

```json
{"event":"learn","learned_literals":[...],"glue":G,"clause_id":CID,"jump_level":JL}
```

| Field              | Type  | Description                                                          |
| ------------------ | ----- | -------------------------------------------------------------------- |
| `learned_literals` | int[] | Literals of the learned clause                                       |
| `glue`             | int   | *Optional.* LBD (Literal Block Distance) of the learned clause       |
| `clause_id`        | int64 | ID of the new clause, `-1` when the solver creates no permanent clause object |
| `jump_level`       | int   | Jump level implied by the clause, the second-highest decision level in it |

`jump_level` is a property of the clause. The level the solver actually returns
to is `to_level` on the following `backtrack`, and the two can differ, for
instance under chronological backtracking. A consumer that wants to answer "was
this backjump chronological?" compares them across the event pair.

---

### `backtrack`

Fire before every trail unwind, whatever caused it, and only when the solver
actually unwinds something (`to_level < from_level`).

```json
{"event":"backtrack","from_level":FL,"to_level":TL,"kind":"conflict","reason":"otfs"}
```

| Field        | Type   | Description                                                |
| ------------ | ------ | ---------------------------------------------------------- |
| `from_level` | int    | Decision level before the unwind                           |
| `to_level`   | int    | Decision level after the unwind                            |
| `kind`       | string | Closed enum, the **only** field a consumer may branch on   |
| `reason`     | string | *Optional.* Free-form detail, display and debugging   |


To apply a `backtrack`, **keep every trail entry whose level is `<= to_level`,
in its existing order, and drop the rest.** Do not truncate the trail at the
first entry above `to_level`. Under chronological backtracking trail levels are
not monotonic. A literal at level 23 can sit after a literal at level 29, so
suffix truncation removes the wrong entries.

#### The `kind` enum

| Value      | Meaning                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------- |
| `conflict` | The unwind resolves a conflict: a backjump after analysis, a chronological unwind taken before analysis, or on-the-fly subsumption |
| `restart`  | The unwind belonging to a `restart` marker                                                   |
| `other`    | Everything else: inprocessing, preprocessing, incremental API, cleanup                       |

A consumer written against them keeps working against a new adapter
without changes. The set is closed. Adapters must not invent values, and a
consumer may treat an unknown one as a malformed log.

Classifying is the adapter's job.

#### The `reason` field

Free-form text naming the solver-internal phase or whatever the adapter deems reasonable.


---

### `restart`

A marker. Fire it when the solver decides to restart. It carries no level
information and implies no trail change.

```json
{"event":"restart","count":N}
```

| Field   | Type  | Description                               |
| ------- | ----- | ----------------------------------------- |
| `count` | int64 | Total restart count, already incremented  |

The restart's unwind, if there is one, arrives as a separate `backtrack` with
`kind: "restart"`. That `backtrack` is absent when the restart unwinds nothing.
E.g. when trail reuse leaves the decision level unchanged.

---

### `delete_clause`

Fire before the solver removes a clause from its clause database.

```json
{"event":"delete_clause","clause_id":CID,"literals":[...]}
```

| Field       | Type  | Description                             |
| ----------- | ----- | --------------------------------------- |
| `clause_id` | int64 | ID of the clause being deleted          |
| `literals`  | int[] | Literals of the clause at deletion time |

---

### `inspect`

Fire for each clause BCP inspects. Optional, and off by default: inspections
are the solver's hot inner loop, so an adapter emits them only when it is asked
for BCP-level logging.

```json
{"event":"inspect","clause_id":CID,"outcome":"unresolved","watched":[L1,L2],"next_watched":[L2,L3]}
```

| Field       | Type   | Description                                              |
| ----------- | ------ | -------------------------------------------------------- |
| `clause_id` | int64  | The clause being inspected                               |
| `outcome`   | string | Closed enum, see below                                   |
| `watched`   | int[2] | *Optional.* The clause's watched literals on arrival      |
| `next_watched` | int[2] | *Optional.* The pair it is left with, when one moved   |

#### The `outcome` enum

| Value        | Meaning                                                   |
| ------------ | --------------------------------------------------------- |
| `satisfied`  | The clause is true, no work to do                         |
| `unit`       | One non-false literal is left, the clause propagates      |
| `falsified`  | Every literal is false                                    |
| `unresolved` | At least two literals are still non-false                 |

Every BCP scheme ever built asks the same question about a clause, and these are
the four answers. A two-watched-literal solver reaches them from its watch pair,
a counter-based one from a false-literal count, a naive solver by scanning the
clause. The set is closed, the same rule as `backtrack.kind`.

**`outcome` is the verdict this solver's BCP reached, not a property of the
clause.** Two solvers may legitimately report different outcomes for the same
clause under the same assignment. A watched-literal solver reports `unresolved`
for a clause that is in fact satisfied by some non-watched literal, because it
never looked. A solver that scans every literal every time reports `satisfied`
for that same clause. The divergence is not an inconsistency in the log. It is
the laziness that makes watched literals fast, and it is the thing a BCP view
exists to show.

#### The `watched` field

Present on every inspection, or on none of them. An adapter for a solver with
no watch scheme omits it everywhere, and a consumer then has the inspection
sequence alone, which is still the bulk of what a BCP view needs.

The pair is what the clause watched **when BCP reached it**, before the
inspection changes anything. One of the two is therefore the literal being
propagated, and that literal is false. This is the pair that explains why the
clause was looked at, which is the question a BCP view is answering.

Reporting the pair the clause is left with instead would be actively confusing.
An inspection that moves a watch would name two literals that have nothing to do
with the watch list being walked, and the reader could not tell why the clause
came up. What the watch moved to shows up when the clause is next inspected.

Carrying the pair on every inspection rather than only when it changes means a
consumer never has to fold watch state to know what a clause is watching.

`next_watched` closes the gap. It appears only on the inspections that move a
watch, and holds the pair the clause is left with, so the two fields together
show the move: `watched` names the falsified literal BCP arrived on, and
`next_watched` names the non-false literal that replaced it. The literal common
to both is the watch that stayed put.

Absence means no replacement was reported, which is not quite the same as no
replacement happening: an adapter whose hook fires before it knows the
destination omits the field rather than guessing.

**Both** watched literals may be false, on any outcome. One always is, since
that is why BCP is here. The other can be too: watch pairs are repaired lazily,
so a watch falsified earlier in the same propagation round stays in place until
its own list is walked. An arriving pair is a state that may need fixing, which
is what the inspection is for.

Blocking literals are not watches and have no place here. They are an
optimisation in one solver family, and replacing one does not change which
literals a clause watches.

No other event carries watch information, and none needs to. A clause's pair is
installed when it is created and only ever moves during propagation, so `inspect`
sees every change. **Backtracking and restarts leave every watch list
untouched**, which is the entire point of the scheme, and worth stating because
a consumer might otherwise assume it has something to unwind.

#### What an `inspect` does not do

It does not change the trail. A `unit` inspection is followed by the `propagate`
it caused, and a `falsified` one by the `conflict`, where the solver raises one.
A consumer folds the `propagate`, never the `inspect`, and must not infer one
from the other.

---

### `result`

Fire immediately after the CDCL loop returns. This is the last event of the
search and a consumer may stop reading there.

```json
{"event":"result","result":"sat"|"unsat"|"unknown","model":[...]}
```

| Field    | Type   | Description                                                                                       |
| -------- | ------ | ------------------------------------------------------------------------------------------------- |
| `result` | string | `"sat"`, `"unsat"`, or `"unknown"`                                                                |
| `model`  | int[]  | For SAT: one literal per variable, positive if true, negative if false. Empty for UNSAT and unknown. |

---

## Semantic vs. informational fields

Fields do not all carry the same weight.

**Semantic.** A consumer's reconstruction is wrong if these are wrong. Get them
right first: `decide.literal/level`,
`propagate.literal/level/reason_clause_id`,
`backtrack.from_level/to_level/kind`, `conflict.clause_id/literals/level/trail`,
`learn.learned_literals/clause_id`, `delete_clause.clause_id`,
`result.result/model`, and all of `init`.

**Informational.** Display and diagnostics. Nothing in a correct consumer
depends on them, and each is either derivable from the semantic fields or a
solver-specific value the adapter picks.

| Field            | Why it is informational                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `learn.glue`     | LBD is a heuristic quality metric, not part of CDCL semantics. A solver that does not compute it may omit it or report `0`. |
| `learn.jump_level` | Derivable, the second-highest level among `learned_literals`. Useful mainly to compare against the following `backtrack.to_level`. |
| `backtrack.reason` | Solver-internal phase name, see the `backtrack` section.                 |
| `restart.count`  | Derivable by counting `restart` events.                                     |
| `propagate.reason_literals` | Derivable, the literals of the clause named by `reason_clause_id`, which the consumer already tracks. |
| `decide.heuristic` | Names the decision heuristic. Entirely solver-specific.                   |

A minimal adapter can omit or stub every informational field and still produce a
log this protocol's consumers handle correctly.

**Extra observation.** `inspect` and its `watched` field are neither. Nothing in a
correct consumer's reconstruction depends on them, and no consumer can derive
them from the rest of the stream either. They are present only if the adapter
reports them, and if present they must be correct.

---

## Reconstructing the trail

Three events change the trail and nothing else does. Replaying a prefix of the
stream is a plain forward fold with no lookahead:

| Event       | Effect                                                          |
| ----------- | --------------------------------------------------------------- |
| `decide`    | append `literal` at `level`                                     |
| `propagate` | append `literal` at `level`                                     |
| `backtrack` | keep entries with level `<= to_level` in order, drop the rest   |

The decision level follows the same rule, `decide.level` going up and
`backtrack.to_level` coming down.

`inspect` in particular changes nothing. It reports what BCP concluded about a
clause; the assignment that follows, if any, arrives as its own `propagate`.

A consumer must not infer trail changes from any other event. Do not treat a
`decide` at level `L` as evidence that the trail was first unwound to `L-1`, and
do not treat a `conflict` as proof that analysis has already backtracked. Rules
like that fit one solver's control flow. They do not fail loudly on another
solver, they produce a plausible wrong trail.

Two invariants a consumer can assert, and which a conforming log satisfies at
every event:

- at each `conflict`, the replayed trail equals the event's `trail` snapshot
  exactly, order included,
- at each `backtrack`, `from_level` equals the consumer's current level.

---

## Validating a log

The JSON schema `event_protocol/json_schemas/solver_event_schema.json` states the structure described
above, and is the authority when this specification is being vague.

`event_protocol/validation/replay_check.py` implements the trail fold and both
invariants above. It is the acceptance test for a new adapter:

```bash
python3 event_protocol/validation/replay_check.py path/to/events.jsonl
```

---

## Implementing an adapter

An adapter is the code that hooks into a solver and emits this stream. One
convenient shape is an observer interface with a method per event, so the hook
code stays separate from serialization. The CaDiCaL adapter in
`solvers/cadical/src/` does that with `SolverObserver.hpp` and
`NdjsonObserver.hpp`, and it is a reasonable starting point for a C++ solver.

Where the hooks go is the adapter author's decision. The usual correspondence:

| Event           | Hook point                                                                          |
| --------------- | ----------------------------------------------------------------------------------- |
| `init`          | Entry of the CDCL loop, after parsing and preprocessing                             |
| `decide`        | After the solver assigns the decision literal                                       |
| `propagate`     | After each BCP-implied literal is assigned                                          |
| `conflict`      | At the start of conflict analysis, and at level 0 before UNSAT, where no `learn` follows |
| `learn`         | After analysis derives the clause, before backtracking                              |
| `restart`       | When the solver decides to restart                                                  |
| `backtrack`     | Before every trail unwind, see below                                                |
| `delete_clause` | Before the solver removes a clause from the database                                |
| `inspect`       | At each outcome site of the propagation loop, see below                             |
| `result`        | After the solver returns                                                            |

Hook `backtrack` at the solver's internal unwind chokepoint, not at its call
sites. Mature CDCL solvers backtrack from far more places than the search loop,
and only the analysis and restart ones belong to search proper. Hook the call
sites one by one and the ones you miss produce a plausible but wrong trail in
every consumer, with no error anywhere. That is the hardest failure mode to
notice. Solvers in this family tend to funnel unwinding through a single
function, because unassignment has to be centralised for the variable-order
heuristics. Hook that function. The same argument applies to `propagate`, which
belongs at the assignment function rather than at its callers.

Fire the hook before anything modifies the trail, so the pre-unwind decision
level is still readable, and place it after the solver's own no-op early return
so `to_level < from_level` always holds.

`inspect` has no single chokepoint. A propagation loop reaches its four outcomes
from separate branches, so the hook goes on each of them, and every branch that
leaves the loop without a verdict (a clause already marked garbage, say) emits
nothing. Read `watched` before the branch does any swapping, so the pair
reported is the one the clause arrived with.
