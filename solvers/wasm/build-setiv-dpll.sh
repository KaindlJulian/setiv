#!/bin/sh

set -eu

CRATE=/src/solvers/setiv-dpll

export CARGO_TARGET_DIR=$CRATE/target-wasm

cargo build --release --manifest-path "$CRATE/Cargo.toml" --target wasm32-wasip1

wasm-opt -Oz "$CARGO_TARGET_DIR/wasm32-wasip1/release/setiv-dpll.wasm" -o /out/setiv-dpll.wasm
