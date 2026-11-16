#!/usr/bin/env bash
# Diagnostyka wdrożenia: Docker → porty → NPM → (opcjonalnie) Cloudflare
# Uruchom NA SERWERZE w katalogu projektu: ./scripts/diagnose-deploy.sh [domena]
if [ -z "${BASH_VERSION:-}" ]; then exec env bash "$0" "$@"; fi

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOMAIN="${1:-}"
WEB_PORT="${WEB_PORT:-8080}"
PB_PORT="${PB_PORT:-8091}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { printf "${GREEN}OK${NC}  %s\n" "$*"; }
warn() { printf "${YELLOW}WARN${NC} %s\n" "$*"; }
fail() { printf "${RED}FAIL${NC} %s\n" "$*"; }

section() { echo; echo "=== $* ==="; }

section "Środowisko"
if [[ -f .env ]]; then
  ok "Znaleziono .env"
  grep -E '^(WEB_BIND|WEB_PORT|PB_PORT|APP_URL|VITE_PB_URL|VITE_OIDC_ENABLED|PB_PUBLIC_URL)=' .env 2>/dev/null || true
else
  fail "Brak .env w $ROOT"
fi

section "Docker Compose"
if command -v docker >/dev/null; then
  docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null || fail "compose ps nie działa (jesteś w katalogu projektu?)"
else
  fail "Brak docker"
fi

section "Kontenery — logi (ostatnie 5 linii)"
for c in ktonazmianie-web ktonazmianie-pocketbase; do
  if docker ps --format '{{.Names}}' | grep -qx "$c"; then
    echo "--- $c ---"
    docker logs "$c" --tail 5 2>&1 || true
  else
    fail "Kontener $c nie działa"
  fi
done

section "Frontend"
if docker inspect ktonazmianie-web --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' 2>/dev/null | grep -q 'web/dist'; then
  if [[ -f web/dist/index.html ]]; then
    ok "Tryb dev: montowany web/dist ($(wc -c < web/dist/index.html) B)"
  else
    fail "Tryb dev bez web/dist — npm run build lub ./scripts/redeploy-web.sh"
  fi
else
  ok "Tryb prod: statyczne pliki w obrazie Docker (./scripts/deploy.sh)"
fi

section "Nasłuch portów na HOŚCIE"
if command -v ss >/dev/null; then
  ss -tlnp | grep -E ":(${WEB_PORT}|${PB_PORT}|80|443)\s" || warn "Nie widać portów ${WEB_PORT}/${PB_PORT}/80/443 w ss (sudo może być potrzebne: ss -tlnp)"
elif command -v netstat >/dev/null; then
  netstat -tlnp 2>/dev/null | grep -E ":(${WEB_PORT}|${PB_PORT}|80|443)\s" || true
else
  warn "Brak ss/netstat"
fi

section "HTTP lokalnie (warstwa aplikacji)"
curl_code() {
  local url="$1"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 3 "$url" 2>/dev/null)" || code="000"
  echo "$code"
}

for url in \
  "http://127.0.0.1:${WEB_PORT}/" \
  "http://127.0.0.1:${WEB_PORT}/api/health" \
  "http://127.0.0.1:${PB_PORT}/api/health"; do
  code="$(curl_code "$url")"
  if [[ "$code" == "200" ]] || [[ "$code" == "204" ]]; then
    ok "$url → HTTP $code"
  else
    fail "$url → HTTP $code (oczekiwano 200 przy / i /api/health)"
  fi
done

section "Proxy /api przez nginx (web)"
body="$(curl -sS --connect-timeout 3 "http://127.0.0.1:${WEB_PORT}/api/health" 2>/dev/null || echo "")"
if echo "$body" | grep -q '"code":200'; then
  ok "PocketBase health przez /api"
else
  fail "Brak poprawnej odpowiedzi PB przez /api — sprawdź web/nginx.conf i sieć compose"
  echo "    body: ${body:0:120}"
fi

section "NPM (Nginx Proxy Manager)"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qiE 'nginx|npm|proxy'; then
  warn "Wykryto kontener(ery) proxy/NPM. Forward na 127.0.0.1:${WEB_PORT} Z WEWNĄTRZ kontenera NPM często NIE trafia na hosta."
  echo "    Opcje:"
  echo "    - Forward Host: IP bramy Dockera (często 172.17.0.1) + port ${WEB_PORT}"
  echo "    - host.docker.internal:${WEB_PORT} (jeśli dostępne)"
  echo "    - Dołącz NPM do sieci ktonazmianie i Forward: ktonazmianie-web:80"
else
  echo "Nie wykryto oczywistego kontenera NPM (nazwa może być inna). Jeśli NPM jest natywnie na hoście, 127.0.0.1:${WEB_PORT} jest OK."
fi

if command -v curl >/dev/null && [[ -n "$DOMAIN" ]]; then
  section "Domena publiczna: $DOMAIN"
  hdr="$(curl -sS -o /dev/null -D - --connect-timeout 10 "https://${DOMAIN}/" 2>/dev/null | head -20 || true)"
  if [[ -n "$hdr" ]]; then
    echo "$hdr" | head -10
    if echo "$hdr" | grep -qi 'server: cloudflare'; then
      ok "Ruch przez Cloudflare (nagłówek server)"
    fi
    code="$(echo "$hdr" | awk '/^HTTP/{print $2; exit}')"
    case "$code" in
      200|301|302|304) ok "HTTPS / → $code" ;;
      522) fail "HTTP $code — CF nie dochodzi do origin (firewall, zły IP, NPM nie nasłuchuje 80/443)" ;;
      521) fail "HTTP $code — origin odrzuca połączenie (NPM wyłączony / brak vhost)" ;;
      525|526) fail "HTTP $code — problem SSL między CF a origin (tryb Full/Strict, certyfikat NPM)" ;;
      *) fail "HTTPS / → $code" ;;
    esac
  else
    fail "Brak odpowiedzi z https://${DOMAIN}/"
  fi

  api_code="$(curl_code "https://${DOMAIN}/api/health")"
  if [[ "$api_code" == "200" ]]; then
    ok "https://${DOMAIN}/api/health → 200"
  else
    fail "https://${DOMAIN}/api/health → $api_code (NPM musi proxy całą domenę, nie tylko /)"
  fi
else
  section "Domena"
  echo "Podaj domenę: ./scripts/diagnose-deploy.sh grafik.naszdzial.it"
fi

section "Konflikt portów (skrót)"
if ss -tlnp 2>/dev/null | grep -q ":${WEB_PORT} "; then
  line="$(ss -tlnp | grep ":${WEB_PORT} " | head -1)"
  echo "$line"
  if echo "$line" | grep -q '127.0.0.1'; then
    ok "WEB nasłuchuje tylko na localhost (dobre przy NPM na tym samym hoście)"
  fi
else
  warn "Port ${WEB_PORT} nie nasłuchuje — compose up?"
fi

echo
echo "Najczęstsze przyczyny:"
echo "  1) Pusty web/dist na serwerze"
echo "  2) NPM w Dockerze → zły forward (127.0.0.1 zamiast IP hosta / nazwy kontenera)"
echo "  3) CF SSL Flexible + NPM oczekuje HTTPS na origin"
echo "  4) Port ${WEB_PORT} zajęty przez inną aplikację"
echo "  5) Firewall blokuje 80/443 na hoście (UFW)"