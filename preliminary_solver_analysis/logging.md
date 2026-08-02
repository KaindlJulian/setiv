# Assessing native logging capabilities of solvers


## 1. Description and Setup


The goal is to find out which solvers would emit sufficient information, in the form of runtime logs, such that we can build visualizations from a post-run analysis of these logs.


One could argue that before doing this we should define what information is needed for each visualization. However, since the visualizations themselves might be subject to change, we will just classify each type of log information that the solver can produce based on the following categories:
  
  

### Events

* **`init`**: Number of variables, number of clauses, initial variable assignment, static information about the problem structure,
* **`decide`**: selected literal, decision level, reason for a decision (random / heuristic)
* **`propagate`**: implied literal by bcp, antecedent/reason clause, decision level
* **`conflict`**: Conflicting clause, literals involved, (sub-)trail snapshot
* **`learn_and_backtrack`**: Learned clause, backtrack target level
* **`restart`**: information about restarts
* **`terminate`**: sat/unsat, model
* **`other`**

  

### Pre-assessment speculations

Just in short, speculation on what data i would expect most solvers to log:

* **`init`**: can be logged
* **`decide`**: selected literal yes, reason / heuristic score maybe
* **`propagate`**: i don't expect solvers to log every propagation, since thats a lot of information
* **`conflict`**: probably not the trail which would be needed for implication graph
* **`learn_and_backtrack`**: backtracking is probably logged, learned clause maybe not
* **`restart`**: can be logged
* **`terminate`**: can be logged


### The formula

a full binary tree  with 2 variables to force conflicts (probably need to disable the solvers pre processing steps). deliberately small to make the logs readable.
  

$\begin{aligned} \Phi = \quad & (x_1 \lor x_2) \\ \land \quad & (x_1 \lor \neg x_2) \\ \land \quad & (\neg x_1 \lor x_2) \\ \land \quad & (\neg x_1 \lor \neg x_2) \end{aligned}$

`full_2.cnf`

```dimacs

p cnf 2 4  

1 2 0  

-1 2 0  

1 -2 0  

-1 -2 0

```


this will not trigger restarts, need a different formula to test that
  

---

  

## 2. Evaluation of  Logging


- Ubuntu 22.04 in WSL
- Each solver was built from source and executed via its cli
- If configurable, verbosity and logging was set to the maximum amount
- Internal optimizations were disabled to get as close to pure cdcl as possible
- No pre/in-processing
- I'll incude some immediate notes after each run, the full breakdown of the logs is below


### 2.1 MiniSat (v2.2.0)

**Command:** `minisat -no-pre -verb=2 full_2.cnf`
**Full Output:** `out/minisat_full_2.txt`
**Notes**:
- only high level statistics, total number of decisions, conflicts, restarts, propagations


### 2.2 Glucose (v4.2.1)

**Command:** `glucose -no-pre -verb=2 -vv=2 full_2.cnf`
**Full Output:** `out/glucose_full_2.txt`
**Notes:**
- some additional info, but same as minisat, since its largely the same solver
  

### 2.3 MapleSAT

**Command:** `maplesat_static -no-pre -verb=2 full_2.cnf`
**Relevant Output:** /
**Full Output:** `out/maplesat_full_2.txt`
**Notes:**
- same as minisat, with addition of LBD statistics

### 2.4 CaDiCal (v3.0.0)
  

**Command:** `cadical -l --plain --lucky=false full_2.cnf`
**Full Output:** `out/cadical_full_2.txt`
**Notes:**
- configured for logging before building it
- `--plain` turns off a lot of internal optimizations
- `--lucky=false` also gets it closer to pure cdcl
- logging output contains promising information


### 2.5 Kissat (v4.0.4)


**Command:** `kissat -l --basic --lucky=false full_2.cnf`
**Full Output:** `out/kissat_full_2.txt`
**Notes:**
- configured for logging before building it
- `--basic`  like plain but also disable restarts, minimize, and reduce
- similar information as cadical
  

### 2.6 SATCH (v0.5.6rc)

**Command:** `satch -l full_2.cnf`
**Full Output:** `out/satch_full_2.txt`
**Notes:**
- configured for logging before building it
- configured for no pre/in processing
- could be configured further, e.g. for pure dpll
- similar information as cadical

---


## 3. Logging capability matrix
  

**✓** = per-event detail (literal, clause, level logged for every occurrence)
**~** = aggregate counts/statistics only
**–** = not triggered by this formula


|              | init | decide | propagate | conflict | learn_and_backtrack | restart | terminate |
| :----------- | :--: | :----: | :-------: | :------: | :-----------------: | :-----: | :-------: |
| **MiniSAT**  |  ~   |   ~    |     ~     |    ~     |          ~          |    ~    |     ✓     |
| **Glucose**  |  ~   |   ~    |     ~     |    ~     |          ~          |    ~    |     ✓     |
| **MapleSAT** |  ~   |   ~    |     ~     |    ~     |          ~          |    ~    |     ✓     |
| **CaDiCaL**  |  ✓   |   ✓    |     ✓     |    ✓     |          ✓          |    –    |     ✓     |
| **Kissat**   |  ✓   |   ✓    |     ✓     |    ✓     |          ✓          |    –    |     ✓     |
| **SATCH**    |  ✓   |   ✓    |     ✓     |    ✓     |          ✓          |    –    |     ✓     |

  
  

### MiniSAT and MiniSAT-based solvers


All three produce only aggregate statistics. there is no per-event logging. Apart from new featues of the solvers based on MiniSAT, the logging is identical.


- **init**: The problem header (variable count, clause count, parse time) is printed.
- **decide**: Total decision count is as a final statistic, including the number percentage random decisions (`decisions: 1 (0.00 % random)`). No individual decisions. e.g. literal chosen, level, or heuristic score is logged.
- **propagate**: Total propagation count as a final statistic. No individual propagation events is logged.
- **conflict**: Total conflict count as a final statistic. No per conflict information: conflicting clause.
- **learn_and_backtrack**: Total learned clause count and aggregated (including LBD statistics for Glucose) as a final statistic. No individual learned clause, its literals, or backtrack target level is logged.
- **terminate**: `UNSATISFIABLE` / `SATISFIABLE`. model on `v` lines
  

### CaDiCaL family

  

Even though CaDiCaL, Kissat, and SATCH are all independent implementations. All three are built by Armin Biere and share the same debugging/logging architecture: compile with `-DLOGGING` and enable at runtime with `-l`.

All logs are timestamped with the current decision level.

#### init

- from the parsing step

**CaDiCaL**
```
c LOG 0 mapping external 1 to internal 1
c LOG 0 mapping external 2 to internal 2
c LOG 0 initializing VMTF queue from 1 to 2
c LOG 0 initializing EVSIDS scores from 1 to 2
c LOG 0 original clause 1 2
c LOG 0 watch 1 blit 2 in irredundant size 2 clause[1] 1 2
c LOG 0 watch 2 blit 1 in irredundant size 2 clause[1] 1 2
```

**Kissat**
```
c LOG 0 importing original external variable 1 as internal literal 0
c LOG 0 importing original external variable 2 as internal literal 2
c LOG 0 watching 0 blocking 2 in binary clause 0 2
c LOG 0 watching 2 blocking 0 in binary clause 2 0
```
  
**SATCH**
```
c LOG 0 imported external literal 1 as internal literal 0
c LOG 0 imported external literal 2 as internal literal 2
c LOG 0 activated variable 0 literal 0(1)
c LOG 0 activated variable 1 literal 2(2)
c LOG 0 watching 0(1) blocking 2(2) in irredundant binary clause 0(1) 2(2)
c LOG 0 watching 2(2) blocking 0(1) in irredundant binary clause 2(2) 0(1)
c LOG 0 imported irredundant binary clause 0(1) 2(2)
```

|          | Variables | Clauses |
| :------- | :-------: | :-----: |
| CaDiCaL  |    yes    |   yes   |
| Kissat   |    yes    |   yes   |
| SATCH    |    yes    |   yes   |


- also info on watchlists and heuristics initialization

#### decide

$x_2 = true$, the only decision in the `full_2.cnf` run.

**CaDiCaL**

```
c LOG 0 next queue decision variable 2 bumped 2
c LOG 0 trying forced phase, i.e., 0
c LOG 1 search decide 2
c LOG 1 search assign 2 @ 1 decision
```

**Kissat**
```
c LOG 1 largest score unassigned variable 1 (literal 2) score 0.5
c LOG 1 next maximum score decision variable 1 (literal 2)
c LOG 1 variable 1 (literal 2) uses initial decision phase 1
c LOG 1 decide literal 2
c LOG 1 assign 2 decision
```

**SATCH**
```
c LOG 1 maximum stamped unassigned variable 1 literal 2(2) with stamp 2
c LOG 1 decision variable 1 literal 2(2)
c LOG 1 decision phase 1
c LOG 1 decision literal 2(2)
c LOG 1 assign 2(2) decision
```
  

|          |      Heuristic score      | decided literal | decision level |
| :------- | :-----------------------: | :-------------: | :------------: |
| CaDiCaL  |     VMTF (`bumped 2`)     |        ✓        |    LOG tag     |
| Kissat   | VSIDS value (`score 0.5`) |        ✓        |    LOG tag     |
| SATCH    |     VMTF  (`stamp 2`)     |        ✓        |    LOG tag     |

  
#### propagate

Propagation: $x_2 = true$  forces $x_1 = true$ via clause $(x_1 \lor \neg x_2)$.

**CaDiCaL**
```
c LOG 1 propagating 2
c LOG 1 checking irredundant size 2 clause[3] 1 -2@1+=-1
c LOG 1 search assign 1 @ 1 irredundant size 2 clause[3] 1@1=1 -2@1+=-1
```

**Kissat**
```
c LOG 1 search propagating 2
c LOG 1 assign 0 reason binary clause 0 3
```

**SATCH**
```
c LOG 1 propagating 2(2)@1=1
c LOG 1 assign 0(1) reason irredundant binary clause 0(1) 3(-2)@1=-1
c LOG 1 found assignment level 1
```


|          | Decision that triggered propagation | Logs reason clause  |         per literal, level and value          |  Clause id  |
| :------- | :---------------------------------: | :-----------------: | :-------------------------------------------: | :---------: |
| CaDiCaL  |                 yes                 | yes (with literals) |      `@level=value`, `+=` marks trigger       | `clause[N]` |
| Kissat   |                 yes                 | yes (with literals) |                      no                       |     no      |
| SATCH    |        yes (with annotation)        | yes (with literals) | internal(external)@level, `=-1` marks trigger |     no      |

#### conflict

First conflict: clause 4, $(\neg x_1 \lor \neg x_2)$, is falsified at decision level 1. The UIP analysis trace follows.

**CaDiCaL**
```
c LOG 1 conflict irredundant size 2 clause[4] -1@1=-1 -2@1+=-1
c LOG 1 2 literals on actual conflict level 1
c LOG 1 analyzing conflict irredundant size 2 clause[4] -1@1=-1 -2@1+=-1
c LOG 1 bumping irredundant size 2 clause[4] -1@1=-1 -2@1+=-1
c LOG 1 found new level 1 contributing to conflict
c LOG 1 analyzed literal -1 assigned at level 1
c LOG 1 analyzed literal -2 assigned at level 1
c LOG 1 analyzing 1 reason irredundant size 2 clause[3] 1@1=1 -2@1+=-1
c LOG 1 bumping irredundant size 2 clause[3] 1@1=1 -2@1+=-1
c LOG 1 first UIP 2
```

**Kissat**
```
c LOG 1 conflicting binary clause 3 1
c LOG 1 found 2 literals on conflict level 1
c LOG 1 analyzing conflict 1 static irredundant binary conflict clause 3 1
c LOG 1 analyzing failed literal 2 conflict static irredundant binary conflict clause 3 1
c LOG 1 negation 3 of failed literal 2 occurs in conflict
```

**SATCH**
```
c LOG 1 conflicting temporary binary clause 3(-2)@1=-1 1(-1)@1=-1
c LOG 1 find conflict: lit 3(-2)@1=-1
c LOG 1 find conflict: lit 1(-1)@1=-1
c LOG 1 2 literals on actual conflict level 1, forced: 3(-2)@1=-1
c LOG 1 no forcing literal
c LOG 1 conflict is on current level
c LOG 1 analyzing temporary binary clause 3(-2)@1=-1 1(-1)@1=-1
c LOG 1 first unique implication point 2(2)@1=1 (1st UIP)
```


|          | Conflicting clause content | Per literal, level and value |  Clause ID  | count of assigned literals on conflict level | 1st UIP |
| :------- | :------------------------: | :--------------------------: | :---------: | :------------------------------------------: | :------ |
| CaDiCaL  |            yes             |         @level=value         | `clause[N]` |                     yes                      | yes     |
| Kissat   |            yes             |              no              |     no      |                     yes                      | yes     |
| SATCH    |            yes             |   internal(external)@level   |     no      |                     yes                      | yes     |


- A trail snapshot is not printed, the trail would need to be reconstructed from the preceding sequence of `assign` and `unassign` log lines.
  

#### learn_and_backtrack

Learned clause $(\neg x_2)$  is derived from the first conflict, followed by backtrack to level 0.

**CaDiCaL**
```
c LOG 1 1st UIP size 1 and glue 0 clause -2
c LOG 1 jump level 0
c LOG 1 jump level identical to chronological backtrack level 0
c LOG 1 backtracking to decision level 0 with decision 0 and trail 0
c LOG 1 unassign 2 @ 1
c LOG 1 unassign 1 @ 1
c LOG 0 learned unit clause -2, stored at position 5
```

**Kissat**
```
c LOG 1 learning negated failed literal 3
c LOG 1 learned[1] clause glue 0 size 1
c LOG 1 backtracking to decision level 0
c LOG 1 unassign 2
c LOG 1 unassign 0
```

**SATCH**
```
c LOG 1 deduced size 1 temporary clause 3(-2)@1=-1
c LOG 1 shrunken 0 literals
c LOG 1 shrunken size 1 temporary clause 3(-2)@1=-1
c LOG 1 asserting level: 0
c LOG 1 normal backjumping
c LOG 1 determined jump level 0 and glue 0
c LOG 1 backtracking to level 0
c LOG 1 unassign 2(2)@1=1
c LOG 1 unassign 0(1)@1=1
```


|          |          Learned clause literals          | Jump target level | Unassignments | Level annotation on unassign |
| :------- | :---------------------------------------: | :---------------: | :-----------: | :--------------------------: |
| CaDiCaL  | in `1st UIP` line + `learned unit clause` |        yes        |      yes      |             yes              |
| Kissat   |  implicit (first line names the literal)  |        yes        |      yes      |         yes, via Tag         |
| SATCH    |    in `deduced` line (full annotation)    |        yes        |      yes      |             yes              |

#### terminate


```
s UNSATISFIABLE
```

  
For SAT instances all three print the satisfying model on `v` lines.

### Intermediate conclusions
- The solvers from the cadical family provide solid logs
- It should, in principle, be possible the construct all needed datastructures for visualizations, specifically from the cadical logs
- Using the raw ouput could prove difficult
	- the logs are unstructured text, designed for human debugging 
	- no trail info
	- need to map between internal and external variables


---


## 4. Next Steps

The most sensible choice is **CaDiCal**. The next steps towards building a parser would be:

- From the relevant logs, reconstruct how the solver solved the instance
- Manually draw 
	- implication graph at points of conflicts
	- (sub)trail at points of conflicts
	- decision tree
- Validate that the data from logs is sufficient to draw these

### 4.1 Hooks

In principle, all the necessary information appears somewhere in the cadical log output. But there are several issues that make using the raw log as a data source fragile and complex:

- **No trail snapshot at conflict time.** The trail must be reconstructed by replaying all`assign` and `unassign`. Since the visualization needs the trail infor for showing implication graphs, the parser needs to rebuild the trail. This needs a stateful parser that essentially rebuilds the trail, as it was in memory when the solver ran.
- The logs are not consistent when **referencing to clauses**, sometimes id is used other times the clause content
- The log format is **unstructured text**, which is designed for human inspection during debugging. That also makes it difficult to parse
- Need to map  internal to external variables

This could be too early in the process, but I would still like to explore the option of injecting custom hooks (basically additional logging code) into the solver. This way a clean interface between the solver and the forntend can be defined and the parser is probably much less complex.
