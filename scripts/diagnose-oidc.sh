#!/usr/bin/env bash
# Diagnostyka OIDC (Authentik + PocketBase). Uruchom na serwerze w katalogu projektu.
if [ -z "${BASH_VERSION:-}" ]; then exec env bash "$0" "$@"; fi
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
source "$ROOT/scripts/lib/load-env.sh"
[[ -f .env ]] && load_deployment_env

DOMAIN="${1:-${APP_URL#https://}}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"

WEB_PORT="${WEB_PORT:-8080}"
PB_PORT="${PB_PORT:-8091}"

echo "=== OIDC / PocketBase ==="
echo "APP_URL=${APP_URL:-<puste>}"
echo

check() {
  local url="$1"
  local label="$2"
  local body code
  body="$(curl -sS --connect-timeout 5 "$url" 2>/dev/null || echo "")"
  code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 5 "$url" 2>/dev/null || echo "000")"
  echo "--- $label ($url) → HTTP $code ---"
  echo "${body:0:400}"
  echo
}

if [[ -n "$DOMAIN" ]]; then
  check "https://${DOMAIN}/api/health" "Health przez publiczną domenę"
  check "https://${DOMAIN}/api/collections/users/auth-methods" "Auth methods (czy oauth2/oidc włączone)"
  methods="$(curl -sS --connect-timeout 5 "https://${DOMAIN}/api/collections/users/auth-methods" 2>/dev/null || echo "")"
  if echo "$methods" | grep -q '"enabled":true' && echo "$methods" | grep -q '"name":"oidc"'; then
  echo "Provider oidc: włączony"
  elif echo "$methods" | grep -q oauth2; then
  echo "UWAGA: oauth2 bez providera 'oidc' w odpowiedzi"
  fi
  if echo "$methods" | grep -q 'redirect_uri=$'; then
  echo "Puste redirect_uri w authURL jest normalne (SDK dokleja URL przy logowaniu)."
  echo "KRYTYCZNE: PB Settings → Application URL = https://${DOMAIN}"
  fi
else
  check "http://127.0.0.1:${WEB_PORT}/api/health" "Health lokalnie (nginx)"
  check "http://127.0.0.1:${WEB_PORT}/api/collections/users/auth-methods" "Auth methods"
fi

echo "=== PocketBase logi (oauth / error) ==="
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx ktonazmianie-pocketbase; then
  docker logs ktonazmianie-pocketbase 2>&1 | grep -iE 'oauth|oidc|error|failed' | tail -30 || echo "(brak dopasowań — spróbuj pełnych logów: docker logs ktonazmianie-pocketbase --tail 80)"
else
  echo "Kontener ktonazmianie-pocketbase nie działa."
fi

echo
echo "Checklista „Failed to authenticate”:"
echo "  1) PB Settings → Application URL = https://twoja-domena (bez /api)"
echo "  2) Authentik redirect (Strict): https://twoja-domena/oauth2-callback (oraz opcjonalnie …/api/oauth2-redirect)"
echo "  3) Provider w PB: nazwa dokładnie „oidc”, scope openid profile email"
echo "  4) Authentik: własny scope email z email_verified: True (2025.10+)"
echo "  5) Po zmianie hooków: docker compose build pocketbase && docker compose up -d pocketbase"
echo "  6) users → Options: włączone OAuth2, create rule nie blokuje rejestracji"