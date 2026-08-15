#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <input_cnf_file>"
    exit 1
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found!"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/out"
mkdir -p "$OUT_DIR"

# Check for explicit $SETIV_DPLL, then the in-tree build, then $PATH.
if [ -z "$SETIV_DPLL" ]; then
    CRATE_DIR="$SCRIPT_DIR/../solvers/setiv-dpll"
    if [ -x "$CRATE_DIR/target/release/setiv-dpll" ]; then
        SETIV_DPLL="$CRATE_DIR/target/release/setiv-dpll"
    else
        SETIV_DPLL="setiv-dpll"
    fi
fi

BASENAME=$(basename "$INPUT_FILE" .cnf)
OUTPUT_FILE="$OUT_DIR/setiv-dpll_${BASENAME}_events.jsonl"

CMD=("$SETIV_DPLL" --events "$OUTPUT_FILE" "$INPUT_FILE")

echo "Running setiv-dpll with event log "
echo "Input:  $INPUT_FILE"
echo "Output: $OUTPUT_FILE"
printf 'Command:'; printf ' %q' "${CMD[@]}"; printf '\n'

"${CMD[@]}" > /dev/null 2>&1
STATUS=$?

echo "Done (exit $STATUS, $RESULT). Event log written to $OUTPUT_FILE"
