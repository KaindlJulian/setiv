#!/bin/sh

set -eu

SRC=/src/solvers/cadical/src
WORK=$(mktemp -d)
JOBS=$(nproc)

# NBUILD skips the generated 'build.hpp'
# The WASI_EMULATED flags enable as much posix emulation as possible, still needed to patch cadical sources though
# https://github.com/arminbiere/cadical/blob/master/BUILD.md
COMMON="--target=wasm32-wasip1 -O2 -DNDEBUG -DNBUILD -DNCONTRACTS -DNTRACING \
-D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_GETPID"

SOURCES=$(ls "$SRC"/*.cpp | grep -v '/mobical\.cpp$')

export WORK 
export COMMON

printf "%s\n" $SOURCES "$SRC/kitten.c" | xargs -P "$JOBS" -I{} sh -c '
  src="{}"
  
  filename="${src##*/}"
  
  obj="$WORK/${filename%.*}.o"
  
  case "$src" in
    *.c) clang $COMMON -std=c99 -c "$src" -o "$obj" ;;
    *)   clang++ $COMMON -fno-exceptions -fno-rtti -c "$src" -o "$obj" ;;
  esac
'


# linking 
clang++ --target=wasm32-wasip1 -O2 "$WORK"/*.o -o "$WORK/cadical.wasm" \
  -lwasi-emulated-signal -lwasi-emulated-process-clocks -lwasi-emulated-getpid

wasm-opt -Oz "$WORK/cadical.wasm" -o /out/cadical.wasm

rm -rf "$WORK"
