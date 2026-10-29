FROM golang:1.24 AS builder
ENV CGO_ENABLED=0 GO111MODULE=on GOPROXY=https://proxy.golang.org,direct GOSUMDB=off

WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .

RUN --mount=type=cache,target=/root/.cache/go-build \
    --mount=type=cache,target=/go/pkg/mod \
    go build -trimpath -tags netgo -ldflags "-s -w" -o /out/app ./cmd/backend

FROM gcr.io/distroless/static-debian12
WORKDIR /app
COPY --from=builder /out/app /app/app
ENV ADDR=":8080" KEYS_DIR="/app/keys" LOGS_DIR="/app/logs" DATA_DIR="/app/data" DATABASE_URL=""
EXPOSE 8080
ENTRYPOINT ["/app/app"]