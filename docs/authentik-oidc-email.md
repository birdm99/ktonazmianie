# Authentik: email dla PocketBase OIDC

PocketBase **nie przypisuje** `email` z OIDC, jeśli w userinfo jest `email_verified: false` (domyślnie w Authentik od 2025.10). Wtedy tworzenie użytkownika kończy się **400 Failed to authenticate** (~60 B).

## 1. Scope mapping `email`

1. Authentik → **Customization** → **Property Mappings** → **Create** → **Scope Mapping**
2. Name: np. `PocketBase email verified`
3. Scope name: `email` (dokładnie)
4. Expression:

```python
return {
    "email": request.user.email,
    "email_verified": True,
}
```

5. **Finish**

## 2. Provider OAuth aplikacji

1. **Applications** → Twoja aplikacja (grafik) → edycja providera OAuth2/OIDC
2. **Scopes**: **usuń** domyślne mapowanie `authentik default OAuth Mapping: OpenID 'email'` i **dodaj** mapowanie z kroku 1 (nie trzymaj obu naraz)
3. Upewnij się, że są też scope'y **openid** i **profile** (domyślne mapowania mogą zostać)
4. Zapisz

## 3. PocketBase provider `oidc`

W panelu PB: **Collections → users → OAuth2 → oidc**

- Userinfo: `https://auth…/application/o/userinfo/`
- Scope (jeśli jest pole): `openid email profile`

## 4. Redirect URI w Authentik

```
https://grafik.naszdzial.it/oauth2-callback
```

## 5. Po zmianie

- Wyloguj się z Authentik (sesja może mieć stary token bez claimów)
- Ponów logowanie OIDC
- Logi PB (po rebuildzie obrazu z hookiem): `docker logs ktonazmianie-pocketbase 2>&1 | grep oauth_users`
- Panel PB → **Logs** → `POST auth-with-oauth2`