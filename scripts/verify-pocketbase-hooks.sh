#!/usr/bin/env bash
# Sprawdza, czy kontener PocketBase ma hooki OIDC i czy rejestracja (createRule) nie blokuje OAuth.
if [ -z "${BASH_VERSION:-}" ]; then exec env bash "$0" "$@"; fi
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib/load-env.sh"
[[ -f .env ]] && load_deployment_env

PB_PORT="${PB_PORT:-8091}"
C="${POCKETBASE_CONTAINER:-ktonazmianie-pocketbase}"

echo "=== Kontener $C ==="
if ! docker ps --format '{{.Names}}' | grep -qx "$C"; then
  echo "Kontener nie działa."
  exit 1
fi

echo "--- pb_hooks w obrazie ---"
docker exec "$C" sh -c 'ls -la /pb_hooks 2>/dev/null || echo "Brak /pb_hooks"'

echo "--- oauth_users.pb.js (pierwsze 3 linie) ---"
docker exec "$C" sh -c 'head -3 /pb_hooks/oauth_users.pb.js 2>/dev/null || echo "BRAK PLIKU — uruchom: docker compose build --no-cache pocketbase && docker compose up -d pocketbase"'

echo "--- Start PB (szukaj oauth_users) ---"
docker logs "$C" 2>&1 | grep -i oauth_users | tail -5 || echo "(brak linii oauth_users — po rebuild sprawdź ponownie)"

echo "--- Migracje (pliki w obrazie) ---"
docker exec "$C" sh -c 'ls /pb_migrations/*.js 2>/dev/null | wc -l'

echo "--- users.createRule (SQLite) ---"
docker exec "$C" sh -c 'command -v sqlite3 >/dev/null && sqlite3 /pb_data/data.db "SELECT name, createRule FROM _collections WHERE name='\''users'\'';" 2>/dev/null || echo "sqlite3 niedostępny — sprawdź Create rule w panelu PB"'

echo ""
echo "Panel PB: Collections → users → API Rules → Create musi pozwalać na rejestrację (pusta reguła = wszyscy)."
echo "Settings → Application → włącz rejestrację użytkowników, jeśli jest taka opcja."
echo "Logi żądań: panel PB → Logs (filtrowanie POST auth-with-oauth2)."