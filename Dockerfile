# ---------------------------------------------------------------------------
# Stage 1: Build
# ---------------------------------------------------------------------------
FROM golang:1.21 AS builder

# CGO is required for go-sqlite3.
RUN apt-get update && apt-get install -y gcc

WORKDIR /app

COPY . .

RUN go mod tidy

RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags="-s -w" -o tenant-panel .

# ---------------------------------------------------------------------------
# Stage 2: Runtime
# ---------------------------------------------------------------------------
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libsqlite3-0 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/tenant-panel .

# Data directory for SQLite database.
RUN mkdir -p /data

ENV DB_PATH=/data/rag-panel.db
ENV PORT=9005
ENV GIN_MODE=release

EXPOSE 9005

VOLUME ["/data"]

ENTRYPOINT ["./tenant-panel"]