#!/usr/bin/env python3
"""
Generate log to event_protocol/out/.

python run_eventlog.py cadical php_4_3.cnf
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.joinpath("event_protocol", "out")
CADICAL = ROOT.joinpath("solvers", "cadical", "build-opt", "cadical")
SETIV_DPLL = ROOT.joinpath("solvers", "setiv-dpll", "target", "release", "setiv-dpll")

# Keeps the search as close to pure CDCL as cadical allows.
# shrink=0 disables shrinking of the conflict clause for non-binary cases.
CADICAL_FLAGS = [
    "--plain",
    "--lucky=false",
    "--no-otfs",
    "--chrono=false",
    "--no-restartreusetrail",
    "--no-stabilize",
    "--no-rephase",
    "--no-walk",
    "--shrink=0",
]


def command(solver, cnf, log):
    if solver == "cadical":
        return [str(CADICAL), *CADICAL_FLAGS, "-j", log, cnf]
    if solver == "setiv-dpll":
        return [str(SETIV_DPLL), "--events", log, cnf]
    sys.exit(f"unknown solver: {solver}")


def main():
    solver, cnf = sys.argv[1], Path(sys.argv[2])
    OUT.mkdir(exist_ok=True)
    log = OUT.joinpath(f"{solver}_{cnf.stem}_events.jsonl")

    cmd = command(solver, str(cnf), str(log))
    print(" ".join(cmd))
    status = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"exit {status.returncode}, event log written to {log}")


if __name__ == "__main__":
    main()
