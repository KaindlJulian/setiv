#!/bin/bash

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <input_cnf_file> <output_directory>"
    exit 1
fi

INPUT_FILE="$1"
OUTPUT_DIR="$2"

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Input file '$INPUT_FILE' not found!"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

BASENAME=$(basename "$INPUT_FILE" .cnf)

echo "Processing file: $INPUT_FILE"
echo "Output directory: $OUTPUT_DIR"
echo "----------------------------------------"

# 1. minisat
echo "Running minisat..."
minisat -no-pre -verb=2 "$INPUT_FILE" > "$OUTPUT_DIR/minisat_${BASENAME}.txt" 2>&1

# 2. glucose
echo "Running glucose..."
glucose -no-pre -verb=2 -vv=2 "$INPUT_FILE" > "$OUTPUT_DIR/glucose_${BASENAME}.txt" 2>&1

# 3. maplesat_static
echo "Running maplesat_static..."
maplesat_static -no-pre -verb=2 "$INPUT_FILE" > "$OUTPUT_DIR/maplesat_static_${BASENAME}.txt" 2>&1

# 4. cadical
echo "Running cadical..."
cadical -l --plain --lucky=false "$INPUT_FILE" > "$OUTPUT_DIR/cadical_${BASENAME}.txt" 2>&1

# 5. kissat
echo "Running kissat..."
kissat -l --basic --lucky=false "$INPUT_FILE" > "$OUTPUT_DIR/kissat_${BASENAME}.txt" 2>&1

# 6. satch
echo "Running satch..."
satch -l "$INPUT_FILE" > "$OUTPUT_DIR/satch_${BASENAME}.txt" 2>&1

echo "----------------------------------------"
echo "All solvers finished. Outputs saved to $OUTPUT_DIR/"
