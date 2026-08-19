# syntax=docker/dockerfile:1
FROM node:20.12.0-alpine AS builder

ENV NODE_ENV=production
WORKDIR /app

COPY apps/web/package.json apps/web/pnpm-lock.yaml ./
RUN corepack enable \
    && pnpm install --frozen-lockfile

COPY apps/web/ ./
RUN pnpm run build

FROM nginx:1.25-alpine
RUN apk add --no-cache tini

COPY --from=builder /app/dist /usr/share/nginx/html/
COPY --from=builder /app/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/docker/entrypoint.sh /docker-entrypoint.sh

# FNOS shared folders expose Git checkout files with mode 000. Normalize only
# the immutable runtime files copied into this image.
RUN find /usr/share/nginx/html -type d -exec chmod 0755 {} + \
    && find /usr/share/nginx/html -type f -exec chmod 0644 {} + \
    && chmod 0755 /docker-entrypoint.sh

ENTRYPOINT ["/sbin/tini", "--", "/docker-entrypoint.sh"]
