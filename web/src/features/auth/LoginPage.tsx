import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { oidcEnabled } from "@/lib/pocketbase";
import { formatPbError } from "@/lib/pbError";
import { useAuth } from "./AuthContext";

const OIDC_FALLBACK =
  "Logowanie OIDC nie powiodło się. Skonfiguruj provider „oidc” w PocketBase (users → OAuth2) i ustaw Application URL.";

export function LoginPage() {
  const { user, login, loginWithOidc } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  if (user) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError("Nieprawidłowy e-mail lub hasło.");
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function onOidc() {
    setError(null);
    setBusy(true);
    try {
      await loginWithOidc();
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatPbError(err, OIDC_FALLBACK));
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-8 flex flex-col items-center text-center">
          <img
            src="/logo.svg"
            alt=""
            width={80}
            height={80}
            className="h-20 w-20"
            decoding="async"
          />
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">Kto na zmianie</h1>
          <p className="mt-1 text-sm text-slate-500">Zaloguj się, aby kontynuować</p>
        </header>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Hasło
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            Zaloguj się
          </button>
        </form>
        {oidcEnabled && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button type="button" className="btn-secondary w-full" disabled={busy} onClick={onOidc}>
              Zaloguj przez OIDC
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
