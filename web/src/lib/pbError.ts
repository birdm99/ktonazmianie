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

  const data = err.response?.data as Record<string, unknown> | undefined;
  if (data) {
    const fromFields = fieldErrors(data);
    if (fromFields) return fromFields;
    if (typeof data.message === "string" && data.message) return data.message;
  }

  const msg = err.response?.message;
  if (msg && msg !== "Something went wrong while processing your request.") {
    return msg;
  }
  if (msg === "Something went wrong while processing your request.") {
    return "Błąd po stronie serwera (reguły API lub hook PocketBase). Odśwież stronę lub zrestartuj kontener pocketbase.";
  }
  if (err.message) return err.message;
  return fallback;
}
