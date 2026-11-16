import PocketBase from "pocketbase";

// SDK dokleja /api/… — baseUrl to origin (np. https://app.pl), nie prefiks /api
function resolvePocketBaseBaseUrl(): string {
  const configured = (import.meta.env.VITE_PB_URL ?? "").trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  // Pusty VITE_PB_URL: ten sam host za reverse proxy (/api → PocketBase).
  // Samo "" daje względne URL-e i na /login trafia POST na /login/api/… (405).
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export const pb = new PocketBase(resolvePocketBaseBaseUrl());

pb.autoCancellation(false);

export const oidcEnabled = import.meta.env.VITE_OIDC_ENABLED === "true";
