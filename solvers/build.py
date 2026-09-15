#!/usr/bin/env python3
"""
Build all solvers in /solvers locally for dev
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

SOLVERS = Path(__file__).resolve().parent
JOBS = str(os.cpu_count())

# two builds from one source
SATCH_CONFIGS = {
    "satch-cdcl": [
        "--events",
        "--no-block",
        "--no-chrono",
        "--no-stable",
        "--no-rephase",
        "--no-reuse",
        "--no-shrink",
        "--no-simplification",
        "--no-vivification",
    ],
    "satch-dpll": [
        "--events",
        "--no-cdcl",
        "--no-block",
        "--no-simplification",
        "--no-vivification",
    ],
}


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


def build_satch():
    crate = SOLVERS.joinpath("satch")
    binaries = []

    for name, flags in SATCH_CONFIGS.items():
        subprocess.run(["make", "clean"], cwd=crate, check=False)
        subprocess.run(["./configure", *flags], cwd=crate, check=True)
        subprocess.run(["make", "-j", JOBS], cwd=crate, check=True)

        binary = crate.joinpath(name)
        shutil.copy2(crate.joinpath("satch"), binary)
        binaries.append(binary)

    return binaries


def build_minisat():
    crate = SOLVERS.joinpath("minisat")
    build = crate.joinpath("build-native")
    build.mkdir(exist_ok=True)

    sources = [
        "minisat/core/Main.cc",
        "minisat/core/Solver.cc",
        "minisat/core/hooks.cc",
        "minisat/utils/Options.cc",
        "minisat/utils/System.cc",
    ]
    binary = build.joinpath("minisat")
    subprocess.run(
        [
            "g++",
            "-O2",
            "-std=c++11",
            "-D__STDC_LIMIT_MACROS",
            "-D__STDC_FORMAT_MACROS",
            "-I",
            str(crate),
            "-o",
            str(binary),
            *[str(crate.joinpath(s)) for s in sources],
            "-lz",
        ],
        check=True,
    )

    return binary


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


def build_satotz():
    crate = SOLVERS.joinpath("satotz")

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

    return crate.joinpath("target", "release", "satotz")


def main():
    try:
        build_cadical()
        build_minisat()
        build_setiv_dpll()
        build_satotz()
        build_satch()
    except Exception as e:
        sys.exit(f"failed: {e}")


if __name__ == "__main__":
    main()
