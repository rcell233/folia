#!/usr/bin/env bash
set -euo pipefail

dev_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "${dev_dir}/../.." && pwd)"

if [[ ! -f "${dev_dir}/.env" ]]; then
  cp "${dev_dir}/.env.example" "${dev_dir}/.env"
  chmod 0600 "${dev_dir}/.env"
  echo "Created ${dev_dir}/.env"
fi

cloud_env="${repo_root}/services/cloud/.env"
if [[ ! -f "${cloud_env}" ]]; then
  sed \
    -e 's/^# SQLX_OFFLINE=true$/SQLX_OFFLINE=true/' \
    -e 's/^GOTRUE_MAILER_AUTOCONFIRM=false$/GOTRUE_MAILER_AUTOCONFIRM=true/' \
    -e 's/^GOTRUE_EXTERNAL_GOOGLE_ENABLED=true$/GOTRUE_EXTERNAL_GOOGLE_ENABLED=false/' \
    -e 's/^APPFLOWY_INDEXER_ENABLED=true$/APPFLOWY_INDEXER_ENABLED=false/' \
    "${repo_root}/services/cloud/dev.env" > "${cloud_env}"
  cat >> "${cloud_env}" <<'EOF'

# Folia local source development overrides.
APPFLOWY_ENVIRONMENT=local
APPFLOWY_REDIS_URI=redis://localhost:6379
APPFLOWY_GOTRUE_JWT_SECRET=hello456
APPFLOWY_BASE_URL=http://localhost:8000
APPFLOWY_S3_REGION=us-east-1
AI_ENABLED=false
RUST_BACKTRACE=1
EOF
  chmod 0600 "${cloud_env}"
  echo "Created ${cloud_env}"
fi

web_env="${repo_root}/apps/web/.env"
if [[ ! -f "${web_env}" ]]; then
  cp "${repo_root}/apps/web/dev.env" "${web_env}"
  chmod 0600 "${web_env}"
  echo "Created ${web_env}"
fi
