#!/usr/bin/env bash
# Pierwszy upload projektu do zdalnego repozytorium Git (GitHub, GitLab, Cursor Origin, …).
# Nie wysyła .env ani danych PocketBase — tylko kod i .env.example.
# Uruchamiaj: bash scripts/push-to-git.sh  (nie: sh — skrypt wymaga bash)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE_URL=""
COMMIT_MSG=""
CREATE_ORIGIN_NAME=""
BRANCH="${GIT_BRANCH:-main}"
YES=0
USE_SSH=0

usage() {
  cat <<'EOF'
Użycie:
  ./scripts/push-to-git.sh
  ./scripts/push-to-git.sh --remote https://github.com/TWOJ_USER/ktoNaZmianie.git
  ./scripts/push-to-git.sh -m "Opis zmian"
  ./scripts/push-to-git.sh --origin-create kto-na-zmianie   # repozytorium na Cursor (origin CLI)
  ./scripts/push-to-git.sh --ssh                          # GitHub: HTTPS → SSH (bez tokenu)

Kroki (GitHub / GitLab — bez skryptów pomocniczych):
  1) Na stronie hosta utwórz PUSTE repozytorium (bez README, bez .gitignore).
  2) Skopiuj adres HTTPS (np. https://github.com/user/repo.git).
  3) Uruchom ten skrypt i wklej adres, albo: --remote <url>
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    -y|--yes) YES=1; shift ;;
    -m|--message) COMMIT_MSG="$2"; shift 2 ;;
    --remote) REMOTE_URL="$2"; shift 2 ;;
    --origin-create) CREATE_ORIGIN_NAME="$2"; shift 2 ;;
    --ssh) USE_SSH=1; shift ;;
    *) echo "Nieznana opcja: $1"; usage; exit 1 ;;
  esac
done

github_https_to_ssh() {
  local url="$1"
  if [[ "$url" =~ ^https://github\.com/([^/]+)/([^/]+)(\.git)?/?$ ]]; then
    echo "git@github.com:${BASH_REMATCH[1]}/${BASH_REMATCH[2]%.git}.git"
    return 0
  fi
  return 1
}

print_github_auth_help() {
  cat <<'EOF'

GitHub NIE przyjmuje zwykłego hasła przy git push.

Opcja A — SSH (zalecane, jeśli masz klucz w GitHub → Settings → SSH keys):
  ./scripts/push-to-git.sh --ssh
  albo: git remote set-url origin git@github.com:birdm99/ktonazmianie.git && git push -u origin main

Opcja B — token (HTTPS):
  GitHub → Settings → Developer settings → Personal access tokens → Generate.
  Przy „Password” wklej TOKEN (nie hasło do konta).

EOF
}

if ! command -v git >/dev/null; then
  echo "Brak programu git — zainstaluj pakiet git i spróbuj ponownie."
  exit 1
fi

if [[ -n "$CREATE_ORIGIN_NAME" ]]; then
  ORIGIN_BIN=""
  if command -v origin >/dev/null; then
    ORIGIN_BIN=origin
  elif [[ -x "$HOME/.local/bin/origin" ]]; then
    ORIGIN_BIN="$HOME/.local/bin/origin"
  fi
  if [[ -z "$ORIGIN_BIN" ]]; then
    echo "Brak CLI „origin” (repozytoria Cursor). Instalacja:"
    echo "  curl -fsSL https://downloads.cursor.com/origin/install.sh | sh"
    echo "  $HOME/.local/bin/origin auth login"
    echo "Potem: ./scripts/push-to-git.sh --origin-create $CREATE_ORIGIN_NAME"
    exit 1
  fi
  echo "=== Tworzenie repozytorium na Cursor (origin) ==="
  if ! "$ORIGIN_BIN" auth status 2>/dev/null | grep -qi 'logged in\|authenticated\|session'; then
    echo "Zaloguj się: $ORIGIN_BIN auth login"
    "$ORIGIN_BIN" auth login
  fi
  CREATE_OUT="$("$ORIGIN_BIN" repo create "$CREATE_ORIGIN_NAME" 2>&1)" || {
    echo "$CREATE_OUT"
    exit 1
  }
  echo "$CREATE_OUT"
  REMOTE_URL="$(echo "$CREATE_OUT" | grep -Eo 'https://origin\.cursor\.com/[^[:space:]]+\.git' | head -1 || true)"
  if [[ -z "$REMOTE_URL" ]]; then
    echo "Nie udało się odczytać URL z origin. Wklej ręcznie: --remote <url>"
    exit 1
  fi
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "=== Inicjalizacja repozytorium git (gałąź: $BRANCH) ==="
  git init -b "$BRANCH"
fi

echo "=== Sprawdzanie sekretów ==="
if git check-ignore -q .env 2>/dev/null || [[ -f .env ]]; then
  if git add -n .env 2>/dev/null | grep -q .; then
    echo "BŁĄD: .env trafiłby do gita — dodaj do .gitignore."
    exit 1
  fi
fi
for forbidden in pocketbase/pb_data web/node_modules node_modules; do
  if [[ -e "$forbidden" ]] && ! git check-ignore -q "$forbidden" 2>/dev/null; then
    echo "UWAGA: $forbidden nie jest w .gitignore — uzupełnij .gitignore przed pushem."
    exit 1
  fi
done
echo "OK  .env i dane PocketBase nie trafią do gita (.gitignore)."

git add -A
if git diff --cached --quiet; then
  echo "Brak nowych zmian do zapisania (commit pusty)."
else
  echo
  echo "=== Pliki do wysłania (skrót) ==="
  git diff --cached --stat
  echo
  if [[ -z "$COMMIT_MSG" ]]; then
    if [[ -n "$(git rev-list -n 1 HEAD 2>/dev/null || true)" ]]; then
      COMMIT_MSG="Aktualizacja projektu Kto na zmianie"
    else
      COMMIT_MSG="Initial commit: Kto na zmianie (PocketBase + React + Docker)"
    fi
  fi
  if [[ "$YES" -eq 0 ]]; then
    read -r -p "Wykonać commit z komunikatem „${COMMIT_MSG}”? [T/n] " confirm
    confirm="${confirm:-T}"
    if [[ ! "$confirm" =~ ^[TtYy]$ ]]; then
      echo "Przerwano przed commit."
      exit 0
    fi
  fi
  git commit -m "$COMMIT_MSG"
  echo "Zapisano commit lokalnie."
fi

CURRENT_REMOTE="$(git remote get-url origin 2>/dev/null || true)"
if [[ -n "$REMOTE_URL" ]]; then
  if [[ -n "$CURRENT_REMOTE" && "$CURRENT_REMOTE" != "$REMOTE_URL" ]]; then
    echo "Uwaga: origin już ustawiony na: $CURRENT_REMOTE"
    if [[ "$YES" -eq 0 ]]; then
      read -r -p "Podmienić na $REMOTE_URL? [t/N] " swap
      if [[ "$swap" =~ ^[TtYy]$ ]]; then
        git remote set-url origin "$REMOTE_URL"
      fi
    fi
  elif [[ -z "$CURRENT_REMOTE" ]]; then
    git remote add origin "$REMOTE_URL"
    echo "Ustawiono remote origin: $REMOTE_URL"
  fi
elif [[ -z "$CURRENT_REMOTE" ]]; then
  echo
  echo "=== Zdalne repozytorium ==="
  echo "Utwórz puste repo na GitHubie/GitLabie i wklej adres HTTPS."
  echo "Przykład: https://github.com/twoj-login/ktoNaZmianie.git"
  echo "Albo Cursor: ./scripts/push-to-git.sh --origin-create kto-na-zmianie"
  read -r -p "URL repozytorium (puste = tylko commit lokalny): " REMOTE_URL
  if [[ -n "$REMOTE_URL" ]]; then
    git remote add origin "$REMOTE_URL"
  else
    echo "Został tylko commit lokalny. Później:"
    echo "  git remote add origin <URL>"
    echo "  git push -u origin $BRANCH"
    exit 0
  fi
fi

if [[ "$USE_SSH" -eq 1 ]]; then
  ORIGIN_NOW="$(git remote get-url origin 2>/dev/null || true)"
  SSH_URL="$(github_https_to_ssh "$ORIGIN_NOW" || true)"
  if [[ -n "$SSH_URL" ]]; then
    git remote set-url origin "$SSH_URL"
    echo "Ustawiono origin na SSH: $SSH_URL"
  else
    echo "Nie rozpoznano adresu GitHub HTTPS — ustaw ręcznie: git remote set-url origin git@github.com:USER/REPO.git"
    exit 1
  fi
fi

echo
echo "=== Wysyłka na serwer (git push) ==="
if [[ "$(git remote get-url origin 2>/dev/null || true)" =~ ^https://github\.com/ ]]; then
  echo "Uwaga: GitHub przez HTTPS wymaga tokenu, nie hasła — użyj --ssh lub PAT (patrz --help)."
fi
if ! git push -u origin "$BRANCH"; then
  print_github_auth_help
  exit 1
fi

echo
echo "Gotowe. Kod jest na zdalnym repozytorium."
echo "Na innym serwerze: git clone <ten sam URL> && cd ktoNaZmianie && ./scripts/deploy.sh"
echo "Pamiętaj: .env NIE jest w gicie — na serwerze powstanie z .env.example przy deploy."