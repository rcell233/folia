#!/usr/bin/env bash
set -euo pipefail

compose_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  echo "Usage: $0 OLD_ORIGIN NEW_ORIGIN [--apply]" >&2
  echo "Without --apply the migration performs a read-only dry-run." >&2
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage
  exit 2
fi

old_origin="${1%/}"
new_origin="${2%/}"
mode="${3:-}"
if [[ -z "${old_origin}" || -z "${new_origin}" || "${old_origin}" == "${new_origin}" ]]; then
  usage
  exit 2
fi
if [[ -n "${mode}" && "${mode}" != "--apply" ]]; then
  usage
  exit 2
fi

cd "${compose_dir}"
set -a
# shellcheck disable=SC1091
source ./.env
set +a
image="${FOLIA_URL_MIGRATOR_IMAGE:-ghcr.io/rcell233/folia-url-migrator:0.1.0}"
database_url="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"

run_migrator() {
  docker run --rm \
    --network folia \
    -e DATABASE_URL="${database_url}" \
    "${image}" "${old_origin}" "${new_origin}" "$@"
}

if [[ "${mode}" != "--apply" ]]; then
  run_migrator
  exit 0
fi

echo "Creating a full application backup before URL migration..."
bash scripts/backup.sh

echo "Stopping public/application services for a consistent migration..."
docker compose stop gateway appflowy-web appflowy-cloud

migration_status=0
run_migrator --apply || migration_status=$?
if [[ ${migration_status} -eq 0 ]]; then
  # Cached encoded collabs must not overwrite the freshly migrated database
  # values when Cloud starts again. Redis is used only as an application cache
  # in this deployment; persistence remains enabled for operational recovery.
  docker compose exec -T redis redis-cli --scan --pattern 'encode_collab_v0:*' \
    | xargs -r -n 100 docker compose exec -T redis redis-cli del >/dev/null
fi

echo "Starting application services..."
docker compose up -d appflowy-cloud appflowy-web gateway

exit "${migration_status}"
