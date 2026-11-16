#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NO_COMPOSE_UP=0
if [[ "${1:-}" == "--no-compose-up" ]]; then
  NO_COMPOSE_UP=1
fi

# shellcheck disable=SC1091
source "$ROOT/scripts/lib/load-env.sh"
[[ -f .env ]] || cp -n .env.example .env 2>/dev/null || true
load_deployment_env

export VITE_PB_URL="${VITE_PB_URL:-}"
export VITE_OIDC_ENABLED="${VITE_OIDC_ENABLED:-true}"

echo "Build frontu: VITE_PB_URL=${VITE_PB_URL:-<window.origin>} VITE_OIDC_ENABLED=${VITE_OIDC_ENABLED}"

cd "$ROOT/web"
if [[ -f package.json ]]; then
  npm run build
else
  echo "Brak npm — użyj ./scripts/deploy.sh (build w Docker)."
  exit 1
fi

if [[ "$NO_COMPOSE_UP" -eq 1 ]]; then
  exit 0
fi

COMPOSE=(docker compose $(compose_files_dev))
"${COMPOSE[@]}" up -d web

echo "Front wdrożony (dev volume): http://127.0.0.1:${WEB_PORT:-8080} (Ctrl+Shift+R)"