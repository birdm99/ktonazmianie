import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { Calendar, User, UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["employee", "admin", "superadmin"];

export function UsersAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<User | null>(null);
  const [calendar, setCalendar] = useState("");
  const [role, setRole] = useState<UserRole>("employee");

  const { data: users = [] } = useQuery({
    queryKey: ["users", "admin-all"],
    queryFn: () =>
      pb.collection("users").getFullList<User>({
        sort: "lastName",
        fields: "id,firstName,lastName,email,role,calendar",
      }),
  });

  const { data: calendars = [] } = useQuery({
    queryKey: ["calendars"],
    queryFn: () => pb.collection("calendars").getFullList<Calendar>({ sort: "name" }),
  });

  const calendarName = (id?: string) => calendars.find((c) => c.id === id)?.name ?? "—";

  function startEdit(user: User) {
    setEditing(user);
    setRole(user.role);
    setCalendar(user.calendar ?? "");
  }

  function resetForm() {
    setEditing(null);
    setCalendar("");
    setRole("employee");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const body: { role: UserRole; calendar?: string } = { role };
    if (role === "superadmin") {
      body.calendar = "";
    } else {
      if (!calendar) {
        alert("Wybierz kalendarz dla tej roli.");
        return;
      }
      body.calendar = calendar;
    }
    await pb.collection("users").update(editing.id, body);
    await qc.invalidateQueries({ queryKey: ["users"] });
    resetForm();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="font-medium">Przypisanie użytkownika</h2>
        {!editing ? (
          <p className="text-sm text-slate-600">Wybierz użytkownika z listy po prawej, aby zmienić rolę lub kalendarz.</p>
        ) : (
          <>
            <p className="text-sm text-slate-700">
              {editing.firstName} {editing.lastName}
              <span className="block text-xs text-slate-500">{editing.email}</span>
            </p>
            <div>
              <label className="label">Rola</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {role !== "superadmin" && (
              <div>
                <label className="label">Kalendarz</label>
                <select className="input" value={calendar} onChange={(e) => setCalendar(e.target.value)} required>
                  <option value="">— wybierz —</option>
                  {calendars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Zapisz
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Anuluj
              </button>
            </div>
          </>
        )}
      </form>

      <ul className="divide-y rounded-xl border bg-white shadow-sm">
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {u.firstName} {u.lastName}
              </p>
              <p className="text-xs text-slate-500">
                {u.email} · {u.role}
                {u.role !== "superadmin" ? ` · ${calendarName(u.calendar)}` : ""}
              </p>
            </div>
            <button type="button" className="btn-secondary text-xs" onClick={() => startEdit(u)}>
              Edytuj
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}