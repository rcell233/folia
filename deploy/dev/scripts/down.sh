#!/usr/bin/env bash
set -euo pipefail

dev_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${dev_dir}"

docker compose down
