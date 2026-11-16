# Kto na zmianie

Aplikacja webowa do zarządzania grafikiem zmian pracowników (widok miesięczny i tygodniowy).

Stos: **PocketBase** (API, baza, auth) + **React (Vite)** + **Docker Compose**.

Szczegółowy opis funkcji i UI: sekcja „Opis” poniżej (pochodzi z pierwotnej specyfikacji produktu).

## Szybki start (Docker)

**Na serwerze lub lokalnie** — wystarczy Docker (Node nie jest wymagany do deploy):

```bash
./scripts/deploy.sh
```

Skrypt sam utworzy `.env` z domyślniami, zbuduje obrazy (front w Dockerze), podniesie stack i sprawdzi `/api/health`.

| Zmienna w `.env` | Po co |
|------------------|--------|
| *(puste domyślnie)* | Działa na dowolnym hoście/porcie; API z tego samego origin |
| `APP_URL` | Jedyna typowa zmiana w prod: publiczny `https://domena` (OIDC, PocketBase Application URL) |
| `WEB_PORT` / `WEB_BIND` | Gdzie NPM forwarduje (domyślnie `127.0.0.1:8080`) |
| `VITE_OIDC_ENABLED` | Przycisk OIDC w UI (provider w PB konfigurujesz później) |

## Wysłanie projektu na Git (backup / inny serwer)

Plik `.env` **nie idzie** do repozytorium (hasła, porty lokalne). W repo jest `.env.example`.

```bash
chmod +x scripts/push-to-git.sh
./scripts/push-to-git.sh
```

1. Załóż **puste** repozytorium na GitHubie lub GitLabie (bez README).
2. Skrypt zainicjuje git, zrobi commit i poprosi o adres HTTPS (`git clone` z UI).
3. **GitHub nie przyjmuje hasła do konta** przy `git push`. Albo **SSH** (`./scripts/push-to-git.sh --ssh` + klucz dodany w GitHub → Settings → SSH keys), albo **Personal access token** zamiast hasła przy HTTPS.
4. Uruchamiaj `bash scripts/push-to-git.sh` (nie `sh`).
5. Przy kolejnych zmianach: ponownie `./scripts/push-to-git.sh` albo `git add -A && git commit -m "…" && git push`.

**Cursor (repozytorium prywatne w Cursor):**

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
~/.local/bin/origin auth login
./scripts/push-to-git.sh --origin-create kto-na-zmianie
```

**Rozwój z Node na hoście** (szybsza iteracja UI — montowany `web/dist`):

```bash
./scripts/dev-up.sh
# po zmianach w web/src:
./scripts/redeploy-web.sh
```

3. Utwórz konto **superuser** (administracja PocketBase):

   ```bash
   docker exec -it ktonazmianie-pocketbase pocketbase superuser upsert twoj@email.pl 'SilneHaslo123!' --dir=/pb_data
   ```

4. Wejdź na:

   | Usługa | URL |
   |--------|-----|
   | Aplikacja (kalendarz) | http://localhost:8080 |
   | Panel PocketBase | http://localhost:8091/_/ |

5. W panelu PocketBase utwórz **pracowników** (kolekcja `users`):
   - Ustaw pola: `firstName`, `lastName`, `role`, `calendar` (grafik), hasło.
   - Role: `employee` (pracownik), `admin` (administrator kalendarza), `superadmin` (cała organizacja).
   - Co najmniej jednego użytkownika ustaw na `superadmin` — zarządza kalendarzami, użytkownikami i świętami.
   - Wyłącz samodzielną rejestrację: **Settings → Application** (opcja rejestracji użytkowników).

6. **Superadmin** w aplikacji (menu **Administracja**):
   - **Kalendarze** — utwórz grafiki (zespoły / lokalizacje),
   - **Użytkownicy** — przypisz każdemu konto do jednego kalendarza,
   - **Święta** — wspólne dla wszystkich kalendarzy,
   - **Typy zmian** — osobno dla każdego kalendarza (wybierz kontekst kalendarza na górze panelu).
   
   **Admin kalendarza** widzi wyłącznie **Typy zmian** swojego grafiku.

## Rozwój lokalny (bez Dockera na froncie)

```bash
# Terminal 1 – tylko PocketBase
docker compose up pocketbase -d

# Terminal 2 – frontend z proxy Vite
cd web && npm install && npm run dev
```

Ustaw w `web/.env.local`:

```env
VITE_PB_URL=http://127.0.0.1:8091
VITE_OIDC_ENABLED=false
```

## OIDC / Authentik (opcjonalnie)

Domyślnie działa logowanie **e-mail + hasło**. SSO włączasz tylko gdy potrzebujesz.

1. W **Authentik** utwórz aplikację OAuth2/OIDC z redirect URI:

   `{PB_PUBLIC_URL}/api/oauth2-redirect`

   Przy osobnym porcie API (domyślny dev): `http://127.0.0.1:8091/api/oauth2-redirect`

   Przy jednej domenie za reverse proxy (prod): np. `https://kalendarz.firma.pl/api/oauth2-redirect`

2. W panelu PocketBase: **Collections → users → OAuth2** → dodaj provider **OIDC** z **nazwą `oidc`** (frontend woła `authWithOAuth2({ provider: "oidc" })`). Wklej Auth / Token / Userinfo URL z Authentik oraz Client ID i secret.

3. Ustaw `VITE_OIDC_ENABLED=true` i przebuduj obraz `web`:

   ```bash
   docker compose build web && docker compose up -d
   ```

4. W PocketBase **Settings → Application** ustaw **Application URL** na publiczny adres API (spójny z redirect URI).

[Wytyczna integracji Authentik ↔ PocketBase](https://integrations.goauthentik.io/platforms/pocketbase/)

## Wdrożenie na serwerze

1. Sklonuj projekt na serwer.
2. `./scripts/deploy.sh` (tworzy `.env`, jeśli go nie ma).
3. (Opcjonalnie) Edytuj `.env`: `APP_URL=https://twoja-domena` i ponów `./scripts/deploy.sh` po pierwszym wejściu na HTTPS.
4. **Nginx Proxy Manager**: `https://domena` → `http://127.0.0.1:WEB_PORT` — cała domena (ścieżka `/api` proxy’uje nginx w kontenerze `web`).
5. Panel PB: tylko `127.0.0.1:PB_PORT` (SSH/tunel); nie publikuj na świat.

**OIDC później:** `APP_URL` w `.env` + Application URL w PocketBase + provider `oidc` + redirect `{APP_URL}/api/oauth2-redirect` w IdP. Przycisk OIDC jest już w buildzie (`VITE_OIDC_ENABLED=true` domyślnie).

## Reverse proxy (produkcja)

Zalecany wariant:

- `https://domena/` → kontener **web** (SPA)
- `https://domena/api/` → kontener **pocketbase** (proxy jak w [web/nginx.conf](web/nginx.conf))

Wtedy w buildzie frontu **zostaw puste** `VITE_PB_URL=` — klient użyje `window.location.origin`, a żądania idą na `/api/…` na tej samej domenie (nginx). **Nie** wpisuj `/api` jako adresu SDK — klient PocketBase sam dokleja `/api/…` i powstanie błędne `/api/api/…` (HTTP 404 przy logowaniu). Ustaw też **Application URL** w PocketBase na `https://domena` (publiczny adres aplikacji).

Alternatywa: osobna subdomena API (`api.domena` → PocketBase) i `VITE_PB_URL=https://api.domena`.

## Struktura repozytorium

```
docker-compose.yml
pocketbase/
  Dockerfile
  pb_migrations/    # schemat kolekcji
  pb_hooks/         # walidacja wpisów shifts
web/
  src/              # React
```

## Zmiany nie zapisują się / pusta baza

- **Nie edytuj plików SQLite ręcznie** (`data.db`) ani nie wstawiaj wierszy SQL „z boku” — aplikacja i panel PB korzystają z API; surowy INSERT często **nie widać w UI** (reguły dostępu, cache WAL) albo psuje spójność.
- Poprawnie: **Collections → `shifts` → New record** w panelu http://localhost:8091/_/ albo **+** w kalendarzu po zalogowaniu.
- Hook `pb_hooks/shifts.pb.js` ustawia i weryfikuje pole `calendar` na zmianach zgodnie z kalendarzem użytkownika.
- Test API (opcjonalnie): `cd web && node scripts/test-superuser-shift.mjs` — powinien wypisać `created …` i `total shifts` &gt; 0.
- Dane PocketBase leżą w wolumenie Docker: `ktonazmianie_pocketbase_data` (nie w katalogu projektu).

## Dane demo (ręcznie)

Po utworzeniu typów zmian np.:

| Nazwa | Skrót | Godziny | Kolor |
|-------|-------|---------|-------|
| Praca biuro | PB | 08:00–16:00 | `#3b82f6` |
| Zdalnie | ZD | 09:00–17:00 | `#22c55e` |
| Urlop | U | (wolne) | `#94a3b8` |

Przypisz `allowedUsers` lub zostaw puste (wszyscy w danym kalendarzu). Zaloguj się jako pracownik i w kalendarzu kliknij **+** w swoim wierszu w wybranym dniu.

## Wiele kalendarzy — checklista po wdrożeniu

Po `docker compose up` i migracji istniejące dane trafiają do kalendarza **„Domyślny”**.

1. Ustaw `role = superadmin` dla konta zarządzającego (panel PB lub **Administracja → Użytkownicy** po pierwszym superadminie).
2. Utwórz kolejne kalendarze i przypisz użytkowników — każdy pracownik / admin kalendarza ma dokładnie jeden `calendar`.
3. Zaloguj się jako pracownik z kalendarza A — w liście wierszy **nie powinno być** osób z kalendarza B.
4. Jako `admin` kalendarza A — edycja typów zmian dotyczy tylko A; brak dostępu do zakładki Święta.
5. Jako `superadmin` — przełącznik kalendarza w nagłówku grafiku; święta globalne; pełny panel administracyjny.

## Pierwotna specyfikacja (funkcjonalna)

### Opis

Aplikacja ma być miejscem do zarządzania zmianami pracowników.
Każdy pracownik widzi listę pracowników i zmiany, czyli jaki typ zmiany (pracy) na dany dzień ma wykonać i w jakich godzinach.
Kalendarz można wyświetlać w 2 formach – tygodniowym albo miesięcznym.
Pracownik powinien mieć dostęp do swoich danych (swojego konta).
Jeśli ma uprawnienia administratora, powinien również mieć możliwość edycji (CRUD) typów zmian.
Każdy pracownik może dodać sobie zmianę (ale tylko sobie).

### Wymagania techniczne

- Logowanie; opcjonalnie OIDC/SSO (Authentik).
- Przeglądarka; responsywny UI.
- Kontenery Docker.

### Flow pracy

Pracownik loguje się do systemu. Widzi swoje zmiany. Aby dodać zmianę, klika **+** w pustej komórce (swój wiersz × data). W popupie wybiera typ zmiany i godziny (domyślne z typu, możliwe do zmiany).
