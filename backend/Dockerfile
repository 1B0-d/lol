FROM golang:1.25 AS builder
WORKDIR /workspace

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o app ./backend/cmd/app

FROM debian:stable-slim
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /workspace/app ./app
COPY --from=builder /workspace/frontend/public ./frontend/public
COPY --from=builder /workspace/docs ./docs
COPY --from=builder /workspace/firebase ./firebase

EXPOSE 8080
CMD ["./app"]
