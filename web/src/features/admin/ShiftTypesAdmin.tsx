import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import { filterByCalendar } from "@/lib/calendarFilter";
import { useAuth } from "@/features/auth/AuthContext";
import { useActiveCalendar } from "@/lib/useActiveCalendar";
import type { ShiftType, User } from "@/lib/types";

const emptyForm = {
  name: "",
  abbreviation: "",
  defaultStart: "",
  defaultEnd: "",
  isFree: false,
  color: "#3b82f6",
  allowedUsers: [] as string[],
};

export function ShiftTypesAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { activeCalendarId, ready, loading } = useActiveCalendar(user);
  const [editing, setEditing] = useState<ShiftType | null>(null);
  const [form, setForm] = useState(emptyForm);

  const calendarFilter = ready ? filterByCalendar(activeCalendarId) : "";

  const { data: types = [] } = useQuery({
    queryKey: ["shift_types", activeCalendarId],
    queryFn: () =>
      pb.collection("shift_types").getFullList<ShiftType>({
        filter: calendarFilter,
        sort: "name",
      }),
    enabled: ready,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users", activeCalendarId],
    queryFn: () =>
      pb.collection("users").getFullList<User>({
        filter: calendarFilter,
        sort: "lastName",
        fields: "id,firstName,lastName,email,role",
      }),
    enabled: ready,
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        abbreviation: editing.abbreviation,
        defaultStart: editing.defaultStart ?? "",
        defaultEnd: editing.defaultEnd ?? "",
        isFree: !!editing.isFree,
        color: editing.color,
        allowedUsers: editing.allowedUsers ?? [],
      });
    } else {
      setForm(emptyForm);
    }
  }, [editing]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    const body = {
      ...form,
      calendar: activeCalendarId,
      defaultStart: form.defaultStart || "",
      defaultEnd: form.defaultEnd || "",
    };
    if (editing) {
      await pb.collection("shift_types").update(editing.id, body);
    } else {
      await pb.collection("shift_types").create(body);
    }
    await qc.invalidateQueries({ queryKey: ["shift_types"] });
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Usunąć ten typ zmiany?")) return;
    await pb.collection("shift_types").delete(id);
    await qc.invalidateQueries({ queryKey: ["shift_types"] });
  }

  if (loading || !ready) {
    return <p className="text-slate-600">Ładowanie kontekstu kalendarza…</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="font-medium">{editing ? "Edycja typu" : "Nowy typ zmiany"}</h2>
        <div>
          <label className="label">Nazwa</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="label">Skrót</label>
          <input className="input" value={form.abbreviation} onChange={(e) => setForm({ ...form, abbreviation: e.target.value })} required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Domyślny start</label>
            <input className="input" placeholder="08:00" value={form.defaultStart} onChange={(e) => setForm({ ...form, defaultStart: e.target.value })} />
          </div>
          <div>
            <label className="label">Domyślny koniec</label>
            <input className="input" placeholder="16:00" value={form.defaultEnd} onChange={(e) => setForm({ ...form, defaultEnd: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Kolor (hex)</label>
          <input className="input" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} required pattern="#[0-9A-Fa-f]{6}" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} />
          Traktuj jako dzień wolny / urlop
        </label>
        <UserMultiSelect
          users={users}
          selected={form.allowedUsers}
          onChange={(allowedUsers) => setForm({ ...form, allowedUsers })}
        />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Zapisz
          </button>
          {editing && (
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>
              Anuluj
            </button>
          )}
        </div>
      </form>

      <ul className="divide-y rounded-xl border bg-white shadow-sm">
        {types.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            <span className="inline-block h-8 w-8 rounded text-center text-xs font-bold leading-8 text-white" style={{ backgroundColor: t.color }}>
              {t.abbreviation}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t.name}</p>
              <p className="text-xs text-slate-500">
                {t.defaultStart || "—"} – {t.defaultEnd || "—"}
                {t.isFree ? " · wolne" : ""}
              </p>
            </div>
            <button type="button" className="btn-secondary text-xs" onClick={() => setEditing(t)}>
              Edytuj
            </button>
            <button type="button" className="btn-danger text-xs" onClick={() => remove(t.id)}>
              Usuń
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UserMultiSelect({
  users,
  selected,
  onChange,
}: {
  users: User[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div>
      <label className="label">Dozwoleni pracownicy (puste = wszyscy w kalendarzu)</label>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded border p-2 text-sm">
        {users.map((u) => (
          <label key={u.id} className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
            {u.firstName} {u.lastName}
          </label>
        ))}
      </div>
    </div>
  );
}