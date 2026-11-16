/** Ścieżka callbacku w aplikacji (dodaj ten URL w Authentik obok /api/oauth2-redirect). */
export const OIDC_CALLBACK_PATH = "/oauth2-callback";

export const OIDC_VERIFIER_KEY = "oidc_code_verifier";
export const OIDC_RETURN_KEY = "oidc_return_to";

export function oidcRedirectUri(): string {
  return `${window.location.origin.replace(/\/$/, "")}${OIDC_CALLBACK_PATH}`;
}

/** PocketBase auth-methods zwraca authURL kończące się na `redirect_uri=`. */
export function buildOidcAuthUrl(pbAuthUrl: string, redirectUri: string): string {
  if (pbAuthUrl.endsWith("redirect_uri=")) {
    return pbAuthUrl + encodeURIComponent(redirectUri);
  }
  const url = new URL(pbAuthUrl);
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}