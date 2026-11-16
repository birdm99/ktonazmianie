#!/usr/bin/env bash
# Jedno wdrożenie na dowolnym serwerze: .env z domyślniami, build w Docker, healthcheck.
if [ -z "${BASH_VERSION:-}" ]; then exec env bash "$0" "$@"; fi
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib/load-env.sh"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Utworzono .env z domyślniami (.env.example)."
fi

load_deployment_env

if ! command -v docker >/dev/null; then
  echo "Brak docker — zainstaluj Docker i uruchom ponownie."
  exit 1
fi

COMPOSE=(docker compose $(compose_files_prod))

echo "=== Wdrożenie (COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME}) ==="
echo "    WEB=${WEB_BIND}:${WEB_PORT}  PB=127.0.0.1:${PB_PORT}  VITE_OIDC_ENABLED=${VITE_OIDC_ENABLED}"
echo "    APP_URL=${APP_URL:-<dowolny host — tylko e-mail/hasło>}"

"${COMPOSE[@]}" build --pull pocketbase web
"${COMPOSE[@]}" up -d

echo "=== Oczekiwanie na health ==="
wait_url() {
  local url="$1"
  local name="$2"
  local i
  for i in $(seq 1 40); do
  if curl -fsS --connect-timeout 2 "$url" >/dev/null 2>&1; then
      echo "OK  $name"
      return 0
    fi
    sleep 2
  done
  echo "WARN: timeout — $name ($url); sprawdź: docker compose logs"
  return 1
}

wait_url "http://127.0.0.1:${WEB_PORT}/api/health" "PocketBase przez nginx"
wait_url "http://127.0.0.1:${WEB_PORT}/" "Aplikacja SPA"

echo
echo "=== Gotowe ==="
echo "  Aplikacja (lokalnie): http://127.0.0.1:${WEB_PORT}/"
echo "  Panel PB (localhost): http://127.0.0.1:${PB_PORT}/_/"
echo
if [[ -n "$APP_URL" ]]; then
  echo "  Publiczny adres (ustaw też w PocketBase → Settings → Application URL):"
  echo "    $APP_URL"
  echo "  Redirect OIDC w IdP:"
  echo "    ${APP_URL}/api/oauth2-redirect"
else
  echo "  Reverse proxy: forward całej domeny na http://${WEB_BIND}:${WEB_PORT}"
  echo "  Gdy masz domenę, ustaw APP_URL w .env i uruchom ponownie ./scripts/deploy.sh"
fi
echo
echo "Superuser PocketBase (jednorazowo):"
echo "  docker exec -it ktonazmianie-pocketbase pocketbase superuser upsert admin@example.com 'Haslo!' --dir=/pb_data"