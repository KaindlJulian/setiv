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

# Check for explicit $CADICAL, then the in-tree build, then $PATH.
if [ -z "$CADICAL" ]; then
    if [ -x "$SCRIPT_DIR/../solvers/cadical/build-opt/cadical" ]; then
        CADICAL="$SCRIPT_DIR/../solvers/cadical/build-opt/cadical"
    else
        CADICAL="cadical"
    fi
fi

# Keep the search as close to pure CDCL as cadical allows.
# shrink=0 disables shrinking of the conflict clause for non-binary cases
CDCL_FLAGS=(
    --plain
    --lucky=false
    --no-otfs
    --chrono=false
    --no-restartreusetrail
    --no-stabilize
    --no-rephase
    --no-walk
    --shrink=0
)

BASENAME=$(basename "$INPUT_FILE" .cnf)
OUTPUT_FILE="$OUT_DIR/cadical_${BASENAME}_events.jsonl"

CMD=("$CADICAL" "${CDCL_FLAGS[@]}" -j "$OUTPUT_FILE" "$INPUT_FILE")

echo "Running cadical with event log "
echo "Input:  $INPUT_FILE"
echo "Output: $OUTPUT_FILE"
printf 'Command:'; printf ' %q' "${CMD[@]}"; printf '\n'

"${CMD[@]}" > /dev/null 2>&1
STATUS=$?

echo "Done (exit $STATUS). Event log written to $OUTPUT_FILE"
