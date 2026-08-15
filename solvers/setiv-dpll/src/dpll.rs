//! Implements the textbook DPLL procedure (https://en.wikipedia.org/wiki/DPLL_algorithm):
//!
//! function DPLL(Φ)
//!     // unit propagation:
//!     while there is a unit clause {l} in Φ do
//!         Φ ← unit-propagate(l, Φ);
//!     // pure literal elimination:
//!     while there is a literal l that occurs pure in Φ do
//!         Φ ← pure-literal-assign(l, Φ);
//!     // stopping conditions:
//!     if Φ is empty then
//!         return true;
//!     if Φ contains an empty clause then
//!         return false;
//!     // DPLL procedure:
//!     l ← choose-literal(Φ);
//!     return DPLL(Φ ∧ {l}) or DPLL(Φ ∧ {¬l});

use crate::dimacs::{Clause, Formula};
use crate::events::{BacktrackKind, EventWriter};
use std::io::{self, Result, Write};

pub struct Solver<'a, W: Write> {
    formula: &'a Formula,
    assign: Vec<Option<bool>>,
    trail: Vec<i32>,
    events: EventWriter<W>,
}

impl<'a, W: Write> Solver<'a, W> {
    pub fn new(formula: &'a Formula, events: EventWriter<W>) -> Self {
        Solver {
            formula,
            assign: vec![None; formula.num_vars + 1],
            trail: Vec::new(),
            events,
        }
    }

    pub fn solve(&mut self) -> Result<Option<Vec<i32>>> {
        self.events
            .init(self.formula.num_vars, &self.formula.clauses)?;

        let model = if self.search(0)? {
            let model: Vec<i32> = (1..=self.formula.num_vars)
                .map(|v| {
                    if self.assign[v] == Some(true) {
                        v as i32
                    } else {
                        -(v as i32)
                    }
                })
                .collect();
            self.events.result("sat", &model)?;
            Some(model)
        } else {
            self.events.result("unsat", &[])?;
            None
        };

        self.events.flush()?;
        Ok(model)
    }

    fn search(&mut self, level: usize) -> io::Result<bool> {
        if let Some(clause) = self.unit_propagate(level)? {
            self.events
                .conflict(clause.id, &clause.lits, level, &self.trail)?;
            return Ok(false);
        }

        self.assign_pure_literals(level)?;

        if self.all_clauses_satisfied() {
            self.assign_free_variables(level)?;
            return Ok(true);
        }

        let literal = self.choose_literal();
        for branch in [literal, -literal] {
            let mark = self.trail.len();
            self.enqueue(branch);
            self.events.decide(branch, level + 1, "first-unassigned")?;

            if self.search(level + 1)? {
                return Ok(true);
            }

            self.events
                .backtrack(level + 1, level, BacktrackKind::Conflict, "failed-branch")?;
            self.undo(mark);
        }

        Ok(false)
    }

    fn unit_propagate(&mut self, level: usize) -> io::Result<Option<&'a Clause>> {
        let formula = self.formula;
        loop {
            let mut assigned_something = false;
            for clause in &formula.clauses {
                let mut unassigned: Option<i32> = None;
                let mut free = 0;
                let mut satisfied = false;
                for &lit in &clause.lits {
                    match self.value(lit) {
                        Some(true) => {
                            satisfied = true;
                            break;
                        }
                        Some(false) => {}
                        None => {
                            free += 1;
                            unassigned = Some(lit);
                        }
                    }
                }
                if satisfied {
                    continue;
                }
                if free == 0 {
                    return Ok(Some(clause));
                }
                if free == 1 {
                    let lit = unassigned.unwrap();
                    self.enqueue(lit);
                    self.events
                        .propagate(lit, level, Some(clause.id), &clause.lits)?;
                    assigned_something = true;
                }
            }
            if !assigned_something {
                return Ok(None);
            }
        }
    }

    fn assign_pure_literals(&mut self, level: usize) -> io::Result<()> {
        loop {
            let pure = self.pure_literals();
            if pure.is_empty() {
                return Ok(());
            }
            for lit in pure {
                self.enqueue(lit);
                self.events.propagate(lit, level, None, &[])?;
            }
        }
    }

    fn pure_literals(&self) -> Vec<i32> {
        let mut positive = vec![false; self.formula.num_vars + 1];
        let mut negative = vec![false; self.formula.num_vars + 1];
        for clause in &self.formula.clauses {
            if clause.lits.iter().any(|&lit| self.value(lit) == Some(true)) {
                continue;
            }
            for &lit in &clause.lits {
                if self.value(lit).is_none() {
                    let seen = if lit > 0 {
                        &mut positive
                    } else {
                        &mut negative
                    };
                    seen[lit.unsigned_abs() as usize] = true;
                }
            }
        }
        (1..=self.formula.num_vars)
            .filter_map(|v| match (positive[v], negative[v]) {
                (true, false) => Some(v as i32),
                (false, true) => Some(-(v as i32)),
                _ => None,
            })
            .collect()
    }

    fn all_clauses_satisfied(&self) -> bool {
        self.formula
            .clauses
            .iter()
            .all(|clause| clause.lits.iter().any(|&lit| self.value(lit) == Some(true)))
    }

    fn assign_free_variables(&mut self, level: usize) -> io::Result<()> {
        for v in 1..=self.formula.num_vars {
            if self.assign[v].is_none() {
                self.enqueue(v as i32);
                self.events.propagate(v as i32, level, None, &[])?;
            }
        }
        Ok(())
    }

    fn choose_literal(&self) -> i32 {
        (1..=self.formula.num_vars)
            .find(|&v| self.assign[v].is_none())
            .map(|v| v as i32)
            .expect("an unsatisfied clause has a free literal, or it would be a conflict")
    }

    fn enqueue(&mut self, lit: i32) {
        self.assign[lit.unsigned_abs() as usize] = Some(lit > 0);
        self.trail.push(lit);
    }

    fn undo(&mut self, mark: usize) {
        for lit in self.trail.drain(mark..) {
            self.assign[lit.unsigned_abs() as usize] = None;
        }
    }

    fn value(&self, lit: i32) -> Option<bool> {
        self.assign[lit.unsigned_abs() as usize].map(|v| v == (lit > 0))
    }
}
