import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import type { Calendar } from "@/lib/types";

export function CalendarsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Calendar | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: calendars = [] } = useQuery({
    queryKey: ["calendars"],
    queryFn: () => pb.collection("calendars").getFullList<Calendar>({ sort: "name" }),
  });

  function resetForm() {
    setEditing(null);
    setName("");
    setDescription("");
  }

  function startEdit(cal: Calendar) {
    setEditing(cal);
    setName(cal.name);
    setDescription(cal.description ?? "");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const body = { name, description: description.trim() || undefined };
    if (editing) {
      await pb.collection("calendars").update(editing.id, body);
    } else {
      await pb.collection("calendars").create(body);
    }
    await qc.invalidateQueries({ queryKey: ["calendars"] });
    resetForm();
  }

  async function remove(id: string) {
    if (!confirm("Usunąć kalendarz? Przypisani użytkownicy i dane mogą zostać niespójne.")) return;
    await pb.collection("calendars").delete(id);
    await qc.invalidateQueries({ queryKey: ["calendars"] });
    if (editing?.id === id) resetForm();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="font-medium">{editing ? "Edycja kalendarza" : "Nowy kalendarz"}</h2>
        <div>
          <label className="label">Nazwa</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Opis (opcjonalnie)</label>
          <textarea
            className="input min-h-[4rem]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Zapisz
          </button>
          {editing && (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Anuluj
            </button>
          )}
        </div>
      </form>

      <ul className="divide-y rounded-xl border bg-white shadow-sm">
        {calendars.map((cal) => (
          <li key={cal.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{cal.name}</p>
              {cal.description && <p className="text-xs text-slate-500">{cal.description}</p>}
            </div>
            <button type="button" className="btn-secondary text-xs" onClick={() => startEdit(cal)}>
              Edytuj
            </button>
            <button type="button" className="btn-danger text-xs" onClick={() => remove(cal.id)}>
              Usuń
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}