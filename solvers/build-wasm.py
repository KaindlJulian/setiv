#!/usr/bin/env python3
"""
Build the solvers to wasm for solving and log generation in web.
.wasm artifacts are placed in the webapp

Everything is built in a docker container (see solvers/wasm/Dockerfile).
"""

import subprocess
import sys
from pathlib import Path

from build import SATCH_CONFIGS

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.joinpath("web", "src", "solvers", "wasm")
IMAGE = "setiv-wasm"


def build_image():
    subprocess.run(
        ["docker", "build", "-q", "-t", IMAGE, ROOT.joinpath("solvers", "wasm")],
        check=True,
    )


def build(script, args=(), artifact=None):
    artifact = artifact or script
    print(f"building {artifact}...")
    subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "-v",
            f"{ROOT}:/src",
            "-v",
            f"{OUT}:/out",
            IMAGE,
            "sh",
            f"/src/solvers/wasm/build-{script}.sh",
            *args,
        ],
        check=True,
    )

    dest = OUT.joinpath(f"{artifact}.wasm")
    print(f"{dest} ({dest.stat().st_size} bytes)")


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    try:
        build_image()
    except Exception as e:
        sys.exit(f"could not build {IMAGE}: {e}")

    try:
        build("setiv-dpll")
        build("satotz")
        build("cadical")
        build("minisat")
        for name, flags in SATCH_CONFIGS.items():
            build("satch", [name, *flags], artifact=name)
    except Exception as e:
        sys.exit(f"could not build solvers: {e}")


if __name__ == "__main__":
    main()
