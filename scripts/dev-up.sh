#!/usr/bin/env bash
# Lokalny dev: PocketBase + web z montowanym web/dist (wymaga wcześniejszego npm run build lub ./scripts/redeploy-web.sh).
if [ -z "${BASH_VERSION:-}" ]; then exec env bash "$0" "$@"; fi
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib/load-env.sh"

[[ -f .env ]] || cp .env.example .env
load_deployment_env

COMPOSE=(docker compose $(compose_files_dev))

if [[ ! -f web/dist/index.html ]]; then
  echo "Brak web/dist — buduję front (npm)…"
  "$ROOT/scripts/redeploy-web.sh" --no-compose-up
fi

"${COMPOSE[@]}" up -d --build

echo "Dev: http://127.0.0.1:${WEB_PORT}/  PB: http://127.0.0.1:${PB_PORT}/_/"