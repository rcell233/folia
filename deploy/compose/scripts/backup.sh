#!/usr/bin/env bash
set -euo pipefail
umask 077

compose_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
root_dir="$(cd "${compose_dir}/../.." && pwd)"
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${root_dir}/backups/${timestamp}"
mkdir -p "${backup_dir}"

cd "${compose_dir}"
set -a
# shellcheck disable=SC1091
source ./.env
set +a
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  -Fc > "${backup_dir}/postgres.dump"
tar -C "${root_dir}/data" -czf "${backup_dir}/minio.tar.gz" minio
cp .env "${backup_dir}/compose.env"
echo "Backup created at ${backup_dir}"
