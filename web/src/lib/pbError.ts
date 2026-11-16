import { ClientResponseError } from "pocketbase";

function fieldErrors(data: Record<string, unknown>): string | null {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (key === "message" || key === "code") continue;
    if (val && typeof val === "object" && "message" in val) {
      parts.push(`${key}: ${String((val as { message: string }).message)}`);
    }
  }
  return parts.length ? parts.join(" · ") : null;
}

export function formatPbError(err: unknown, fallback: string): string {
  if (!(err instanceof ClientResponseError)) return fallback;

  const raw = err.response as Record<string, unknown> | undefined;
  const data = (raw?.data ?? err.data) as Record<string, unknown> | undefined;
  if (data) {
    const fromFields = fieldErrors(data);
    if (fromFields) return fromFields;
    const nested = data.data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const fromNested = fieldErrors(nested as Record<string, unknown>);
      if (fromNested) return fromNested;
    }
    if (typeof data.message === "string" && data.message) return data.message;
  }

  const msg =
    (typeof raw?.message === "string" ? raw.message : undefined) ?? err.message;
  if (msg === "Failed to authenticate.") {
    return (
      "Logowanie OIDC nie powiodło się (PocketBase 400). " +
      "Sprawdź: Application URL = publiczna domena, redirect w Authentik, " +
      "scope email z email_verified, provider „oidc” w PB, oraz docker logs pocketbase."
    );
  }
  if (msg && msg !== "Something went wrong while processing your request.") {
    return msg;
  }
  if (msg === "Something went wrong while processing your request.") {
    return "Błąd po stronie serwera (reguły API lub hook PocketBase). Odśwież stronę lub zrestartuj kontener pocketbase.";
  }
  if (err.message) return err.message;
  return fallback;
}
