import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import { formatPbError } from "@/lib/pbError";
import {
  OIDC_RETURN_KEY,
  OIDC_VERIFIER_KEY,
  oidcRedirectUri,
} from "@/lib/oidc";
export function OidcCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error");
      const code = params.get("code");

      if (oauthError) {
        if (!cancelled) {
          setError(`Authentik: ${oauthError}`);
        }
        return;
      }

      const verifier = sessionStorage.getItem(OIDC_VERIFIER_KEY);
      sessionStorage.removeItem(OIDC_VERIFIER_KEY);

      if (!code || !verifier) {
        if (!cancelled) {
          setError("Brak kodu OIDC lub wygasła sesja logowania — spróbuj ponownie.");
        }
        return;
      }

      const redirectUri = oidcRedirectUri();

      try {
        await pb.collection("users").authWithOAuth2Code(
          "oidc",
          code,
          verifier,
          redirectUri,
          { role: "employee" },
          { expand: "calendar" }
        );
        if (cancelled) return;
        const returnTo = sessionStorage.getItem(OIDC_RETURN_KEY) || "/";
        sessionStorage.removeItem(OIDC_RETURN_KEY);
        navigate(returnTo, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(formatPbError(err, "Logowanie OIDC nie powiodło się."));
        }
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      {error ? (
        <>
          <p className="text-center text-red-700">{error}</p>
          <button type="button" className="btn-primary" onClick={() => navigate("/login", { replace: true })}>
            Wróć do logowania
          </button>
        </>
      ) : (
        <p className="text-slate-600">Trwa logowanie przez OIDC…</p>
      )}
    </div>
  );
}