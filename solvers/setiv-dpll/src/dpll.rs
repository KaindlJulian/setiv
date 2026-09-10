//! Implements a very simple recursive DPLL search (no PLE)
//!
//! DPLL(φ)
//! F := BCP(φ) boolean constraint propagation
//! if φ = > return satisfiable
//! if ⊥ ∈ φ return unsatisfiable
//! pick remaining variable x and literal l ∈ {x, ¬x}
//! if DPLL(φ ∧ {l}) returns satisfiable return satisfiable
//! return DPLL(φ ∧ {¬l})

use crate::dimacs::{Clause, Formula};
use crate::events::{BacktrackKind, EventWriter, InspectOutcome};
use std::io::{self, Result, Write};

pub struct Solver<'a, W: Write> {
    formula: &'a Formula,
    assign: Vec<Option<bool>>,
    trail: Vec<i32>,
    events: EventWriter<W>,
}

enum Status {
    Satisfied,
    Falsified,
    Unit(i32),
    Unresolved,
}

impl Status {
    fn outcome(&self) -> InspectOutcome {
        match self {
            Status::Satisfied => InspectOutcome::Satisfied,
            Status::Falsified => InspectOutcome::Falsified,
            Status::Unit(_) => InspectOutcome::Unit,
            Status::Unresolved => InspectOutcome::Unresolved,
        }
    }
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
            Some(self.model())
        } else {
            None
        };

        match &model {
            Some(model) => self.events.result("sat", model)?,
            None => self.events.result("unsat", &[])?,
        }
        self.events.flush()?;
        Ok(model)
    }

    fn search(&mut self, level: usize) -> io::Result<bool> {
        let conflict = self.propagate(level)?;

        if self.all_clauses_satisfied() {
            return Ok(true);
        }

        if let Some(clause) = conflict {
            self.events
                .conflict(clause.id, &clause.lits, level, &self.trail)?;
            return Ok(false);
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

    fn propagate(&mut self, level: usize) -> io::Result<Option<&'a Clause>> {
        let formula = self.formula;
        loop {
            let mut assigned_something = false;
            for clause in &formula.clauses {
                let status = self.status(clause);
                self.events.inspect(clause.id, status.outcome())?;

                match status {
                    Status::Falsified => return Ok(Some(clause)),
                    Status::Unit(lit) => {
                        self.enqueue(lit);
                        self.events
                            .propagate(lit, level, Some(clause.id), &clause.lits)?;
                        assigned_something = true;
                    }
                    Status::Satisfied | Status::Unresolved => {}
                }
            }
            if !assigned_something {
                return Ok(None);
            }
        }
    }

    fn status(&self, clause: &Clause) -> Status {
        let mut unassigned = None;
        let mut free = 0;
        for &lit in &clause.lits {
            match self.value(lit) {
                Some(true) => return Status::Satisfied,
                Some(false) => {}
                None => {
                    free += 1;
                    unassigned = Some(lit);
                }
            }
        }
        match free {
            0 => Status::Falsified,
            1 => Status::Unit(unassigned.expect("a free literal was recorded")),
            _ => Status::Unresolved,
        }
    }

    fn all_clauses_satisfied(&self) -> bool {
        self.formula
            .clauses
            .iter()
            .all(|clause| matches!(self.status(clause), Status::Satisfied))
    }

    fn model(&self) -> Vec<i32> {
        (1..=self.formula.num_vars)
            .map(|v| {
                if self.assign[v] == Some(false) {
                    -(v as i32)
                } else {
                    v as i32
                }
            })
            .collect()
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
