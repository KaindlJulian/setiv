//! Serializer for the Solver Event Protocol (`event_protocol/solver_event_protocol.md`).

use crate::dimacs::Clause;
use std::io::{self, Write};

pub const PROTOCOL_VERSION: &str = "2";

#[allow(dead_code)]
pub enum BacktrackKind {
    Conflict,
    Restart,
    Other,
}

impl BacktrackKind {
    fn as_str(&self) -> &'static str {
        match self {
            BacktrackKind::Conflict => "conflict",
            BacktrackKind::Restart => "restart",
            BacktrackKind::Other => "other",
        }
    }
}

pub struct EventWriter<W: Write> {
    out: W,
    buf: String,
}

impl<W: Write> EventWriter<W> {
    pub fn new(out: W) -> Self {
        EventWriter {
            out,
            buf: String::new(),
        }
    }

    pub fn init(&mut self, num_vars: usize, clauses: &[Clause]) -> io::Result<()> {
        self.buf.clear();
        self.buf.push_str(r#"{"event":"init","protocol_version":""#);
        self.buf.push_str(PROTOCOL_VERSION);
        self.buf.push_str(r#"","variables":"#);
        push_int(&mut self.buf, num_vars as i64);
        self.buf.push_str(r#","clauses":"#);
        push_int(&mut self.buf, clauses.len() as i64);
        self.buf.push_str(r#","variable_ids":["#);
        for v in 1..=num_vars {
            if v > 1 {
                self.buf.push(',');
            }
            push_int(&mut self.buf, v as i64);
        }
        self.buf.push_str(r#"],"clause_list":["#);
        for (i, c) in clauses.iter().enumerate() {
            if i > 0 {
                self.buf.push(',');
            }
            self.buf.push_str(r#"{"id":"#);
            push_int(&mut self.buf, c.id as i64);
            self.buf.push_str(r#","literals":"#);
            push_lits(&mut self.buf, &c.lits);
            self.buf.push('}');
        }
        self.buf.push_str("]}");
        self.flush_line()
    }

    pub fn decide(&mut self, literal: i32, level: usize, heuristic: &str) -> io::Result<()> {
        self.buf.clear();
        self.buf.push_str(r#"{"event":"decide","literal":"#);
        push_int(&mut self.buf, literal as i64);
        self.buf.push_str(r#","level":"#);
        push_int(&mut self.buf, level as i64);
        self.buf.push_str(r#","heuristic":""#);
        self.buf.push_str(heuristic);
        self.buf.push_str(r#""}"#);
        self.flush_line()
    }

    pub fn propagate(
        &mut self,
        literal: i32,
        level: usize,
        reason_clause_id: Option<u64>,
        _reason_literals: &[i32],
    ) -> io::Result<()> {
        self.buf.clear();
        self.buf.push_str(r#"{"event":"propagate","literal":"#);
        push_int(&mut self.buf, literal as i64);
        self.buf.push_str(r#","level":"#);
        push_int(&mut self.buf, level as i64);
        self.buf.push_str(r#","reason_clause_id":"#);
        match reason_clause_id {
            Some(id) => push_int(&mut self.buf, id as i64),
            None => self.buf.push_str("null"),
        }
        /*self.buf.push_str(r#","reason_literals":"#);
        push_lits(&mut self.buf, reason_literals);*/
        self.buf.push('}');
        self.flush_line()
    }

    pub fn conflict(
        &mut self,
        clause_id: u64,
        literals: &[i32],
        level: usize,
        trail: &[i32],
    ) -> io::Result<()> {
        self.buf.clear();
        self.buf.push_str(r#"{"event":"conflict","clause_id":"#);
        push_int(&mut self.buf, clause_id as i64);
        self.buf.push_str(r#","literals":"#);
        push_lits(&mut self.buf, literals);
        self.buf.push_str(r#","level":"#);
        push_int(&mut self.buf, level as i64);
        self.buf.push_str(r#","trail":"#);
        push_lits(&mut self.buf, trail);
        self.buf.push('}');
        self.flush_line()
    }

    pub fn backtrack(
        &mut self,
        from_level: usize,
        to_level: usize,
        kind: BacktrackKind,
        reason: &str,
    ) -> io::Result<()> {
        self.buf.clear();
        self.buf.push_str(r#"{"event":"backtrack","from_level":"#);
        push_int(&mut self.buf, from_level as i64);
        self.buf.push_str(r#","to_level":"#);
        push_int(&mut self.buf, to_level as i64);
        self.buf.push_str(r#","kind":""#);
        self.buf.push_str(kind.as_str());
        self.buf.push_str(r#"","reason":""#);
        self.buf.push_str(reason);
        self.buf.push_str(r#""}"#);
        self.flush_line()
    }

    pub fn result(&mut self, result: &str, model: &[i32]) -> io::Result<()> {
        self.buf.clear();
        self.buf.push_str(r#"{"event":"result","result":""#);
        self.buf.push_str(result);
        self.buf.push_str(r#"","model":"#);
        push_lits(&mut self.buf, model);
        self.buf.push('}');
        self.flush_line()
    }

    pub fn flush(&mut self) -> io::Result<()> {
        self.out.flush()
    }

    fn flush_line(&mut self) -> io::Result<()> {
        self.out.write_all(self.buf.as_bytes())?;
        self.out.write_all(b"\n")
    }
}

fn push_int(buf: &mut String, value: i64) {
    buf.push_str(&value.to_string());
}

fn push_lits(buf: &mut String, lits: &[i32]) {
    buf.push('[');
    for (i, l) in lits.iter().enumerate() {
        if i > 0 {
            buf.push(',');
        }
        push_int(buf, *l as i64);
    }
    buf.push(']');
}
