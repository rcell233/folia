#!/usr/bin/env bash
set -euo pipefail

dev_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
"${dev_dir}/scripts/init.sh"
cd "${dev_dir}"

docker compose config --quiet
docker compose pull
docker compose up -d --wait
docker compose ps
