#!/usr/bin/env bash
# Ustawia PocketBase meta.appUrl (wymagane przy OIDC za reverse proxy).
# Użycie: APP_URL=https://grafik.firma.pl ./scripts/fix-pb-app-url.sh superuser@mail.pl 'haslo'
if [ -z "${BASH_VERSION:-}" ]; then exec env bash "$0" "$@"; fi
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib/load-env.sh"
[[ -f .env ]] && load_deployment_env

PB_PORT="${PB_PORT:-8091}"
APP_URL="${APP_URL:-}"

if [[ -z "$APP_URL" ]]; then
  echo "Ustaw APP_URL w .env (np. https://grafik.naszdzial.it) lub export APP_URL=..."
  exit 1
fi

EMAIL="${1:-}"
PASS="${2:-}"
if [[ -z "$EMAIL" || -z "$PASS" ]]; then
  echo "Użycie: APP_URL=https://domena $0 superuser@mail.pl 'haslo'"
  exit 1
fi

PB_BASE="http://127.0.0.1:${PB_PORT}"

TOKEN="$(curl -sS "${PB_BASE}/api/collections/_superusers/auth-with-password" \
  -H 'Content-Type: application/json' \
  -d "$(printf '{"identity":"%s","password":"%s"}' "$EMAIL" "$PASS")" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('token',''))")"

if [[ -z "$TOKEN" ]]; then
  echo "Błąd logowania superusera na ${PB_BASE}"
  exit 1
fi

SETTINGS="$(curl -sS "${PB_BASE}/api/settings" -H "Authorization: ${TOKEN}")"
APP_NAME="$(printf '%s' "$SETTINGS" | python3 -c "import json,sys; d=json.load(sys.stdin); print((d.get('meta') or {}).get('appName') or 'ktoNaZmianie')")"
SENDER_NAME="$(printf '%s' "$SETTINGS" | python3 -c "import json,sys; d=json.load(sys.stdin); print((d.get('meta') or {}).get('senderName') or 'ktoNaZmianie')")"
SENDER_ADDRESS="$(printf '%s' "$SETTINGS" | python3 -c "import json,sys; d=json.load(sys.stdin); print((d.get('meta') or {}).get('senderAddress') or 'noreply@local.invalid')")"

curl -sS -X PATCH "${PB_BASE}/api/settings" \
  -H "Authorization: ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "$(APP_URL="$APP_URL" APP_NAME="$APP_NAME" SENDER_NAME="$SENDER_NAME" SENDER_ADDRESS="$SENDER_ADDRESS" python3 -c '
import json, os
print(json.dumps({
  "meta": {
    "appName": os.environ["APP_NAME"],
    "appUrl": os.environ["APP_URL"],
    "senderName": os.environ["SENDER_NAME"],
    "senderAddress": os.environ["SENDER_ADDRESS"],
  }
}))
')" | python3 -c "import json,sys; d=json.load(sys.stdin); print('appUrl:', (d.get('meta') or {}).get('appUrl'))"

echo "OK — Application URL = ${APP_URL}"
echo "Redirect w Authentik: ${APP_URL}/oauth2-callback"