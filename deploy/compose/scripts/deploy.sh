#!/usr/bin/env bash
set -euo pipefail

compose_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${compose_dir}"

if [[ ! -f .env ]]; then
  echo "Missing ${compose_dir}/.env; run scripts/init-env.sh first." >&2
  exit 1
fi

docker compose config --quiet
docker compose pull
docker compose up -d --remove-orphans
docker compose ps
