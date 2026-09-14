#!/bin/sh

set -eu

# minisat/core only

SRC=/src/solvers/minisat
WORK=$(mktemp -d)
JOBS=$(nproc)

#  no zlib
COMMON="--target=wasm32-wasip1 -O2 -DNDEBUG -D__STDC_LIMIT_MACROS -D__STDC_FORMAT_MACROS \
-D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_GETPID \
-I$SRC"

SOURCES="$SRC/minisat/core/Solver.cc
$SRC/minisat/core/hooks.cc
$SRC/minisat/core/Main.cc
$SRC/minisat/utils/Options.cc
$SRC/minisat/utils/System.cc"

export WORK
export COMMON

printf "%s\n" $SOURCES | xargs -P "$JOBS" -I{} sh -c '
  src="{}"
  filename="${src##*/}"
  obj="$WORK/${filename%.*}.o"
  clang++ $COMMON -fno-exceptions -fno-rtti -c "$src" -o "$obj"
'

clang++ --target=wasm32-wasip1 -O2 "$WORK"/*.o -o "$WORK/minisat.wasm" \
  -lwasi-emulated-signal -lwasi-emulated-process-clocks -lwasi-emulated-getpid

wasm-opt -Oz "$WORK/minisat.wasm" -o /out/minisat.wasm

rm -rf "$WORK"
