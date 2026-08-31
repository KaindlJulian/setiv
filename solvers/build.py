#!/usr/bin/env python3
"""
Build the solvers locally for dev and debugging
Binaries stay in each solver's build directory
"""

import os
import subprocess
import sys
from pathlib import Path

SOLVERS = Path(__file__).resolve().parent
JOBS = str(os.cpu_count())


def build_cadical():
    crate = SOLVERS.joinpath("cadical")

    # -g -l is the debug build with logging, the one the event hooks need.
    debug = crate.joinpath("build")
    debug.mkdir(exist_ok=True)
    subprocess.run(["../configure", "-g", "-l"], cwd=debug, check=True)
    subprocess.run(["make", "-j", JOBS], cwd=debug, check=True)

    opt = crate.joinpath("build-opt")
    opt.mkdir(exist_ok=True)
    subprocess.run(["../configure"], cwd=opt, check=True)
    subprocess.run(["make", "-j", JOBS], cwd=opt, check=True)

    return opt.joinpath("cadical")


def build_setiv_dpll():
    crate = SOLVERS.joinpath("setiv-dpll")

    subprocess.run(
        [
            "cargo",
            "build",
            "--release",
            "--manifest-path",
            str(crate.joinpath("Cargo.toml")),
        ],
        check=True,
    )

    return crate.joinpath("target", "release", "setiv-dpll")


def main():
    try:
        build_cadical()
        build_setiv_dpll()
    except Exception as e:
        sys.exit(f"failed: {e}")


if __name__ == "__main__":
    main()
