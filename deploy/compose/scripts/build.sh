#!/usr/bin/env bash
set -euo pipefail

compose_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${compose_dir}"

services=("$@")
if [[ ${#services[@]} -eq 0 ]]; then
  services=(appflowy-cloud appflowy-worker appflowy-web gotrue url-migrator)
fi

docker compose \
  --profile tools \
  -f compose.yaml \
  -f compose.build.yaml \
  build "${services[@]}"
