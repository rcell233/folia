# syntax=docker/dockerfile:1
FROM golang:1.22.3-alpine AS builder
WORKDIR /src
COPY services/auth/go.mod services/auth/go.sum ./
RUN go mod download
COPY services/auth/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/auth .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl \
    && adduser -D -u 1000 supabase
WORKDIR /app
COPY --from=builder /out/auth ./auth
COPY --from=builder /src/migrations ./migrations
COPY services/cloud/docker/gotrue/start.sh ./start.sh
# FNOS shared folders may expose Git checkout modes as 000. Normalize runtime
# permissions explicitly instead of relying on source filesystem metadata.
RUN chmod 0755 ./auth ./start.sh \
    && find ./migrations -type d -exec chmod 0755 {} + \
    && find ./migrations -type f -exec chmod 0644 {} + \
    && chown -R supabase:supabase /app
USER supabase
CMD ["./start.sh"]
