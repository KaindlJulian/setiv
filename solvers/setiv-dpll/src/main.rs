mod dimacs;
mod dpll;
mod events;

use dpll::Solver;
use events::EventWriter;
use std::fs::File;
use std::io::{self, BufWriter, Write};
use std::process::ExitCode;

const USAGE: &str = "usage: setiv-dpll [--events FILE] <input.cnf>

  --events FILE   write the NDJSON event log to FILE; without it, no log
  -h, --help      show this message
";

fn main() -> ExitCode {
    let mut input: Option<String> = None;
    let mut events_path: Option<String> = None;

    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "-h" | "--help" => {
                println!("{USAGE}");
                return ExitCode::SUCCESS;
            }
            "--events" | "-o" => match args.next() {
                Some(path) => events_path = Some(path),
                None => return fail("--events needs a file path"),
            },
            _ if input.is_none() => input = Some(arg),
            _ => return fail(&format!("unexpected argument '{arg}'")),
        }
    }

    let Some(input) = input else {
        eprintln!("{USAGE}");
        return ExitCode::from(1);
    };

    let text = match std::fs::read_to_string(&input) {
        Ok(text) => text,
        Err(e) => return fail(&format!("cannot read {input}: {e}")),
    };
    let formula = match dimacs::parse(&text) {
        Ok(formula) => formula,
        Err(e) => return fail(&format!("{input}: {e}")),
    };

    let solved = match &events_path {
        Some(path) => match File::create(path) {
            Ok(file) => run(&formula, BufWriter::new(file)),
            Err(e) => return fail(&format!("cannot write {path}: {e}")),
        },
        None => run(&formula, io::sink()),
    };
    let model = match solved {
        Ok(model) => model,
        Err(e) => return fail(&format!("writing events: {e}")),
    };

    match model {
        Some(model) => {
            println!("s SATISFIABLE");
            print!("v");
            for lit in model {
                print!(" {lit}");
            }
            println!(" 0");
            let _ = io::stdout().flush();
            ExitCode::from(10)
        }
        None => {
            println!("s UNSATISFIABLE");
            let _ = io::stdout().flush();
            ExitCode::from(20)
        }
    }
}

fn run<W: Write>(formula: &dimacs::Formula, out: W) -> io::Result<Option<Vec<i32>>> {
    Solver::new(formula, EventWriter::new(out)).solve()
}

fn fail(message: &str) -> ExitCode {
    eprintln!("setiv-dpll: {message}");
    ExitCode::from(1)
}
