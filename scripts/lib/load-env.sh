# Ładowanie i ujednolicenie .env (source z katalogu głównego projektu).
# Użycie: ROOT=...; source "$ROOT/scripts/lib/load-env.sh"; load_deployment_env

load_deployment_env() {
  local root="${ROOT:?ROOT musi wskazywać katalog projeku}"
  local env_file="$root/.env"

  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi

  WEB_BIND="${WEB_BIND:-127.0.0.1}"
  WEB_PORT="${WEB_PORT:-8080}"
  PB_PORT="${PB_PORT:-8091}"

  VITE_OIDC_ENABLED="${VITE_OIDC_ENABLED:-true}"

  # Jeden publiczny adres aplikacji (HTTPS, bez /api). Opcjonalny — puste = działa na każdym hoście.
  if [[ -n "${APP_URL:-}" ]]; then
    APP_URL="${APP_URL%/}"
  elif [[ -n "${PB_PUBLIC_URL:-}" ]]; then
    APP_URL="${PB_PUBLIC_URL%/}"
  else
    APP_URL=""
  fi
  export APP_URL PB_PUBLIC_URL="${PB_PUBLIC_URL:-$APP_URL}"

  # OIDC: jawny origin w buildzie frontu, gdy znasz domenę (inaczej window.location.origin).
  if [[ -z "${VITE_PB_URL:-}" && -n "$APP_URL" ]]; then
    VITE_PB_URL="$APP_URL"
  fi
  VITE_PB_URL="${VITE_PB_URL:-}"

  export WEB_BIND WEB_PORT PB_PORT VITE_PB_URL VITE_OIDC_ENABLED
  export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-ktonazmianie}"
}

compose_files_prod() {
  echo "-f docker-compose.yml"
}

compose_files_dev() {
  echo "-f docker-compose.yml -f docker-compose.dev.yml"
}