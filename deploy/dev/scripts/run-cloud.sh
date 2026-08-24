#!/usr/bin/env bash
set -euo pipefail

dev_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "${dev_dir}/../.." && pwd)"
"${dev_dir}/scripts/init.sh"
cd "${repo_root}/services/cloud"

exec cargo run --package xtask -- --no-worker
