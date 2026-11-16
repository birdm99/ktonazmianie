import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import type { User } from "@/lib/types";
import { useAuth } from "../auth/AuthContext";

export function SettingsPage() {
  const { user, refresh } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMessage(null);
    setError(null);
    try {
      const body: Partial<User> & { password?: string; passwordConfirm?: string } = {
        firstName,
        lastName,
        email,
      };
      if (password) {
        body.password = password;
        body.passwordConfirm = password;
      }
      await pb.collection("users").update(user.id, body);
      await refresh();
      setPassword("");
      setMessage("Zapisano zmiany.");
    } catch (err) {
      setError("Nie udało się zapisać danych.");
      console.error(err);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Ustawienia konta</h1>
        <Link to="/" className="text-sm text-sky-600 hover:underline">
          Wróć do kalendarza
        </Link>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <label className="label" htmlFor="firstName">
            Imię
          </label>
          <input id="firstName" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="lastName">
            Nazwisko
          </label>
          <input id="lastName" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Nowe hasło (opcjonalnie)
          </label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary">
          Zapisz
        </button>
      </form>
    </div>
  );
}
