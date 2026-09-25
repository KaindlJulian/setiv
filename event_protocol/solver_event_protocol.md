# Solver event protocol
Version: ``1``

A solver-agnostic NDJSON event stream for CDCL event extraction.

- A SAT solver produces this events in a log style stream
- A frontend can consume the stream and build views

## Contents

This document is an introduction and guide to the solver event protocol. Roughly split into:



**Structure of the Event Stream:** 
- [Newline delimited JSON format (NDJSON)](#newline-delimited-JSON-format)
- [Events](#events)
  - [`init`](#init)
  - [`decide`](#decide)
  - [`propagate`](#propagate)
  - [`conflict`](#conflict)
  - [`learn`](#learn)
  - [`backtrack`](#backtrack)
  - [`restart`](#restart)
  - [`delete_clause`](#delete_clause)
  - [`inspect`](#inspect)
  - [`result`](#result)


**Documentation for the Implementation of an Adapter**

- *adapter* is an implementation of the protocol for a specific SAT solver.
- *consumer* is any program that reads/processes an event stream. In the context of this project it is the viewer in `/web`


## Newline delimited JSON format

Each event is a single JSON object on its own line. Newlines delimit the
events.

How the JSON is serialized or formatted does not matter, as long as it is correct JSON and validates against the schemas in `event_protocol/json_schemas/`.


## Events

### `init`

Should be fired once as the first event. It establishes the original formulas variable and
clause set that later events refer to.

```json
{"event":"init","protocol_version":"1","variables":1,"clauses":1,"variable_ids":[1],"clause_list":[{"id":1,"literals":[1]}]}
```

| Field              | Type     | Description                                        |
| ------------------ | -------- | -------------------------------------------------- |
| `protocol_version` | string   | Version of the protocol |
| `variables`        | int      | Number of variables                                |
| `clauses`          | int      | Number of clauses in `clause_list`                 |
| `variable_ids`     | int[]    | Variable indices                                   |
| `clause_list`      | object[] | Each entry has `id` (int64) and `literals` (int[]) |

The value of `clause_list` shold be the clause database the solver will search with. That may not match the input formula.
However, it should be at least self-consistent:

- `clauses` equals the length of `clause_list`,
- ids in `clause_list` are the same ids later events use for those clauses,
- any assignment the solver already holds when search begins should be sent as a root-level `propagate`, rather than sitting implicit in `init`.


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
| `heuristic` | string | *Optional.* Free-form text. Which decision heuristic picked it, display only   |

- heuristic may also include the score. E.g. "vsids: 1"

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


### `conflict`

Fire at the start of conflict analysis, before anything modifies the trail. Fire
it also for a conflict at decision level 0.

```json
{"event":"conflict","clause_id":1,"literals":[1],"level":1,"trail":[1]}
```

| Field       | Type  | Description                                   |
| ----------- | ----- | --------------------------------------------- |
| `clause_id` | int64 | ID of the falsified clause                    |
| `literals`  | int[] | Literals of the falsified clause              |
| `level`     | int   | Decision level when the solver hit the conflict |
| `trail`     | int[] | A trail snapshot at the time of conflict analysis. All assigned literals in assignment order     |


### `learn`

Fire after conflict analysis derives a clause.

This event reports the learned clause, not a trail change.

```json
{"event":"learn","learned_literals":[1],"glue":0,"clause_id":1,"jump_level":0}
```

| Field              | Type  | Description                                                          |
| ------------------ | ----- | -------------------------------------------------------------------- |
| `learned_literals` | int[] | Literals of the learned clause                                       |
| `clause_id`        | int64 | ID of the new clause, `-1` when the solver creates no permanent clause object |
| `jump_level`       | int   | Jump level implied by the clause, the second-highest decision level in it |
| `glue`             | int   | *Optional.* LBD (Literal Block Distance) of the learned clause       |

`jump_level` is a property of the learned clause and does not imply any backtracking. Use the `backtrack` event for that. 


### `backtrack`

Fire before every trail unwind.

```json
{"event":"backtrack","from_level":1,"to_level":0,"kind":"conflict","reason":"reason"}
```

| Field        | Type   | Description                                                |
| ------------ | ------ | ---------------------------------------------------------- |
| `from_level` | int    | Decision level before the unwind                           |
| `to_level`   | int    | Decision level after the unwind                            |
| `kind`       | string | Closed enum, the **only** field a consumer may branch on   |
| `reason`     | string | *Optional.* Free form detail, display and debugging   |


#### `kind` enum

| Value      | Meaning                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------- |
| `conflict` | The unwind resolves a conflict: a backjump after analysis, a chronological unwind taken before analysis, or on-the-fly subsumption |
| `restart`  | The unwind belonging to a `restart` marker                                                   |
| `other`    | Everything else: inprocessing, preprocessing, incremental API, cleanup                       |



### `restart`

Essentially a restart marker. Fired whenever the solver restarts.

```json
{"event":"restart","count":1}
```

| Field   | Type  | Description                               |
| ------- | ----- | ----------------------------------------- |
| `count` | int64 | Running total restart count, already incremented  |

The restart's unwind, if there is one, arrives as a separate `backtrack` with
`kind: "restart"`. That `backtrack` is absent when the restart unwinds nothing,
for example when trail reuse leaves the decision level unchanged.


### `delete_clause`

Fire before the solver removes a clause from its clause database.

```json
{"event":"delete_clause","clause_id":1,"literals":[1]}
```

| Field       | Type  | Description                             |
| ----------- | ----- | --------------------------------------- |
| `clause_id` | int64 | ID of the clause being deleted          |
| `literals`  | int[] | Literals of the deleted clause |


### `inspect`

Fire each time a clause is inspected during unit propagation. 
Optional, since it will blow up a log significantly if emitted.

```json
{"event":"inspect","clause_id":1,"outcome":"unresolved","watched":[1,2],"next_watched":[2,3]}
```

| Field       | Type   | Description                                              |
| ----------- | ------ | -------------------------------------------------------- |
| `clause_id` | int64  | The clause being inspected                               |
| `outcome`   | string | `satisfied`,`unit` ,`falsified` , or `unresolved`                                |
| `watched`   | int[2] | *Optional.* The watched literals   |
| `next_watched` | int[2] | *Optional.* The watched literals after updating   |

#### The `outcome` enum

| Value        | Meaning                                                   |
| ------------ | --------------------------------------------------------- |
| `satisfied`  | The clause is true                       |
| `unit`       | One non-false literal is left, the clause propagates      |
| `falsified`  | All literal are false                                    |
| `unresolved` | At least two literals are still non-false                 |



### `result`

Fire immediately after the CDCL loop returns. This is the last event of the
search and a consumer may stop reading there.

```json
{"event":"result","result":"sat","model":[1,2]}
```

| Field    | Type   | Description                                                                                       |
| -------- | ------ | ------------------------------------------------------------------------------------------------- |
| `result` | string | `"sat"`, `"unsat"`, or `"unknown"`                                                                |
| `model`  | int[]  | For SAT: one literal per variable, positive if true, negative if false. Empty for UNSAT and unknown. |


## Implementing an Adapter

An adapter is the code that *hooks* into a SAT solver and produces an event stream as described above. 
This is the place where one has to decide how the solver should expose its behavior to the consumers of the stream produced.

### Conventions

- **Decision levels** are non-negative integers. The root level is 0.
- **Literals** in DIMACS format. Signed integers: positive = variable true, negative = variable false. Variables are numbered `1..N`.
- **Clause IDs** are integers assigned at clause creation and unique. `-1` means the clause is not in the clause database, e.g. (learned) unit clause.



### Reconstructing the trail

Three events change the trail.

| Event       | Effect                                                          |
| ----------- | --------------------------------------------------------------- |
| `decide`    | append `literal` at `level`                                     |
| `propagate` | append `literal` at `level`                                     |
| `backtrack` | keep entries with level `<= to_level`, drop the rest   |


Two invariants:

- at each `conflict`, the replayed trail equals the snapshot in `conflict.trail` 
- at each `backtrack`, `from_level` equals the "current level" in the log



### Validate a log

The JSON schema `event_protocol/json_schemas/solver_event_schema.json` states the
structure described above.

`event_protocol/validation/replay_check.py` implements the trail fold and checks the two
invariants above.

```bash
python3 event_protocol/validation/replay_check.py events.jsonl
```



### Hook points

Where the hooks go is the adapters decision and largely depends on the SAT solvers search implementation. Usually they land on:

| Event           | Hook point                                                                          |
| --------------- | ----------------------------------------------------------------------------------- |
| [`init`](#init)          | Entry of the CDCL loop, after parsing and preprocessing                             |
| [`decide`](#decide)        | After the solver assigns the decision literal                                       |
| [`propagate`](#propagate)     | After each BCP-implied literal is assigned                                          |
| [`conflict`](#conflict)      | At the start of conflict analysis, and at level 0 before UNSAT |
| [`learn`](#learn)         | After analysis derives the clause, before backtracking                              |
| [`backtrack`](#backtrack)       | Before every trail unwind                                                   |
| [`restart`](#restart)     |      When the solver restarts                                     |
| [`delete_clause`](#delete_clause) | Before the solver removes a clause from the database                                |
| [`inspect`](#inspect)       | At each outcome of unit propagation                            |
| [`result`](#result)        | When the solver returns                                                            |
