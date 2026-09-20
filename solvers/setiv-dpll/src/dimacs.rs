use nom::branch::alt;
use nom::bytes::complete::tag;
use nom::character::complete::{i32 as int, multispace1, not_line_ending, u64 as number};
use nom::combinator::{eof, peek, value, verify};
use nom::multi::{many0, many_till};
use nom::sequence::{delimited, preceded, terminated};
use nom::{IResult, Parser};

pub struct Formula {
    pub num_vars: usize,
    pub clauses: Vec<Clause>,
}

pub struct Clause {
    pub id: u64,
    pub lits: Vec<i32>,
}

fn skip(input: &str) -> IResult<&str, ()> {
    // The comment marker has to be a token of its own, otherwise every line
    // starting with a c word is read as a comment.
    let comment = preceded(
        terminated(tag("c"), peek(alt((multispace1, eof)))),
        not_line_ending,
    );
    value((), many0(alt((multispace1, comment)))).parse(input)
}

fn parse_clause(id: u64, input: &str) -> IResult<&str, Clause> {
    let literal = preceded(skip, verify(int, |l: &i32| *l != 0));
    let terminator = preceded(skip, verify(int, |l: &i32| *l == 0));
    let (input, (lits, _)) = many_till(literal, terminator).parse(input)?;
    Ok((input, Clause { id, lits }))
}

pub fn parse_dimacs_cnf(input: &str) -> IResult<&str, (u64, Vec<Clause>)> {
    let (input, _) = skip(input)?;
    let (input, variables) = delimited(tag("p cnf "), number, not_line_ending).parse(input)?;
    let mut id = 0;
    let (input, clauses) = many0(|rest| {
        id += 1;
        parse_clause(id, rest)
    })
    .parse(input)?;
    let (input, _) = skip(input)?;
    Ok((input, (variables, clauses)))
}

pub fn parse(text: &str) -> Result<Formula, String> {
    let (rest, (declared, clauses)) = parse_dimacs_cnf(text)
        .map_err(|_| "expected a 'p cnf <variables> <clauses>' header".to_string())?;

    if !rest.is_empty() && !rest.starts_with('%') {
        let line = rest.lines().next().unwrap_or_default();
        return Err(format!("unparsed input at '{line}'"));
    }
    
    if clauses.iter().any(|clause| clause.lits.is_empty()) {
        return Err("empty clause".to_string());
    }

    let num_vars = clauses
        .iter()
        .flat_map(|clause| &clause.lits)
        .map(|lit| lit.unsigned_abs() as usize)
        .max()
        .unwrap_or(0)
        .max(declared as usize);
    if num_vars == 0 {
        return Err("formula declares no variables".to_string());
    }

    Ok(Formula { num_vars, clauses })
}
