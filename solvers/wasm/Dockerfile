FROM ghcr.io/webassembly/wasi-sdk:wasi-sdk-25 AS wasi-sdk
FROM rust:1-slim

COPY --from=wasi-sdk /opt/wasi-sdk /opt/wasi-sdk
ENV PATH="/opt/wasi-sdk/bin:${PATH}"

RUN apt-get update \
    && apt-get install -y --no-install-recommends binaryen \
    && rm -rf /var/lib/apt/lists/* \
    && rustup target add wasm32-wasip1
