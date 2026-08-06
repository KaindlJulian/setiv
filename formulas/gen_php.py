"""
Usage:
python gen_php.py <pigeons> <holes>
Creates a dimacs cnf file in the cwd
"""

import sys
from cnfgen import PigeonholePrinciple

pigeons, holes = int(sys.argv[1]), int(sys.argv[2])
out = f"php_{pigeons}_{holes}.cnf"
formula = PigeonholePrinciple(pigeons, holes)

lines = [
    "c Generated with https://cnfgen.readthedocs.io/en/stable/cnfformula.families.pigeonhole.html",
    f"c PHP({pigeons},{holes}): {pigeons} pigeons, {holes} holes. UNSAT.",
    f"c Variables: p[i][j] = (i-1)*{holes} + j, pigeon i in hole j.",
]

for i in range(1, pigeons + 1):
    vs = " ".join(f"{(i - 1) * holes + j}(h{j})" for j in range(1, holes + 1))
    lines.append(f"c   Pigeon {i}: {vs}")

lines.append(formula.to_dimacs().strip())

with open(out, "w", newline="\n") as f:
    f.write("\n".join(lines) + "\n")

print(f"Done: {out}")
