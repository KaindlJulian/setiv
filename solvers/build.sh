#!/bin/bash

# Cadical builds

cd "$(dirname "$0")/cadical"

mkdir -p build
cd build
../configure -g -l
make -j"$(nproc)"
cd ..

mkdir -p build-opt
cd build-opt
../configure
make -j"$(nproc)"
cd ..


CADICAL="$(pwd)/build-opt/cadical"


# setiv-dpll build

cd "$(dirname "$0")/setiv-dpll"

cargo build --release

SETIV_DPLL="$(pwd)/target/release/setiv-dpll"
