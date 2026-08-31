#!/usr/bin/env python3
"""
Build the solvers to wasm for solving and log generation in web.
.wasm artifacts are placed in web/public/solvers/.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.joinpath("web", "public", "solvers")


def build_setiv_dpll():
    target = "wasm32-wasip1"
    crate = ROOT.joinpath("solvers", "setiv-dpll")
    built = crate.joinpath("target", target, "release", "setiv-dpll.wasm")
    dest = OUT.joinpath("setiv-dpll.wasm")

    installed = subprocess.run(
        ["rustup", "target", "list", "--installed"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.split()
    if target not in installed:
        subprocess.run(["rustup", "target", "add", target], check=True)

    subprocess.run(
        [
            "cargo",
            "build",
            "--release",
            "--manifest-path",
            str(crate.joinpath("Cargo.toml")),
            "--target",
            target,
        ],
        check=True,
    )

    try:
        subprocess.run(["wasm-opt", "-Oz", "-o", str(dest), str(built)], check=True)
    except FileNotFoundError:
        print("wasm-opt not found, copying unoptimized")
        dest.write_bytes(built.read_bytes())

    print(f"{dest} ({dest.stat().st_size} bytes)")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    try:
        build_setiv_dpll()
    except Exception as e:
        sys.exit(f"failed: {e}")


if __name__ == "__main__":
    main()
