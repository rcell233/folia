#!/usr/bin/env bash
set -euo pipefail

compose_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${compose_dir}/.env"

if [[ -e "${env_file}" ]]; then
  echo "Refusing to overwrite ${env_file}" >&2
  exit 1
fi

umask 077
postgres_password="$(openssl rand -hex 24)"
jwt_secret="$(openssl rand -hex 32)"
admin_password="$(openssl rand -base64 24 | tr -d '\n')"
minio_password="$(openssl rand -hex 24)"

sed \
  -e "s|POSTGRES_PASSWORD=CHANGE_ME|POSTGRES_PASSWORD=${postgres_password}|" \
  -e "s|GOTRUE_JWT_SECRET=CHANGE_ME_AT_LEAST_32_CHARACTERS|GOTRUE_JWT_SECRET=${jwt_secret}|" \
  -e "s|GOTRUE_ADMIN_PASSWORD=CHANGE_ME|GOTRUE_ADMIN_PASSWORD=${admin_password}|" \
  -e "s|MINIO_ROOT_PASSWORD=CHANGE_ME|MINIO_ROOT_PASSWORD=${minio_password}|" \
  "${compose_dir}/.env.example" > "${env_file}"

chmod 0600 "${env_file}"
echo "Created ${env_file}; secrets were not printed."
