#!/bin/sh

set -eu

# Usage: build-satch.sh <artifact-name> <configure-option> ...
#
# satch configures in its root dir, so the sources are copied to a temporary directory
# and configured there.

SRC=/src/solvers/satch
NAME=$1
shift

WORK=$(mktemp -d)
cp "$SRC"/*.c "$SRC"/*.h "$SRC"/configure "$SRC"/mkconfig.sh "$SRC"/makefile.in \
  "$SRC"/VERSION "$WORK"
cp -r "$SRC/features" "$WORK/features"
cd "$WORK"

# Take the feature macros from satch own configure

./configure "$@" > /dev/null
DEFINES=$(sed -n 's/^COMPILE=gcc //p' makefile | tr ' ' '\n' | grep '^-D' | tr '\n' ' ')

# The WASI_EMULATED flags enable as much posix emulation as possible.

COMPILE="clang --target=wasm32-wasip1 -O2 -std=c99 $DEFINES \
-D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -D_WASI_EMULATED_GETPID"

sed -i "s|^COMPILE=.*|COMPILE=$COMPILE|" makefile
./mkconfig.sh > config.c

for src in satch.c main.c config.c; do
  $COMPILE -c "$src" -o "$WORK/${src%.c}.o"
done

clang --target=wasm32-wasip1 -O2 "$WORK"/satch.o "$WORK"/main.o "$WORK"/config.o \
  -o "$WORK/$NAME.wasm" -lm \
  -lwasi-emulated-signal -lwasi-emulated-process-clocks -lwasi-emulated-getpid

wasm-opt -Oz "$WORK/$NAME.wasm" -o "/out/$NAME.wasm"

rm -rf "$WORK"
