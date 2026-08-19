FROM rust:1.86-bookworm AS builder
WORKDIR /src
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/src/target \
    cargo build --release --locked \
    && cp /src/target/release/appflowy-url-migrator /tmp/appflowy-url-migrator

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /tmp/appflowy-url-migrator /usr/local/bin/appflowy-url-migrator
ENTRYPOINT ["/usr/local/bin/appflowy-url-migrator"]
