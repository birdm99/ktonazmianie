import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { normalizePbDate } from "@/lib/dates";
import { pb } from "@/lib/pocketbase";
import type { Holiday } from "@/lib/types";

export function HolidaysAdmin() {
  const qc = useQueryClient();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => pb.collection("holidays").getFullList<Holiday>({ sort: "date" }),
  });

  async function addHoliday(e: FormEvent) {
    e.preventDefault();
    await pb.collection("holidays").create({ date, name: name || undefined });
    setDate("");
    setName("");
    await qc.invalidateQueries({ queryKey: ["holidays"] });
  }

  async function remove(id: string) {
    if (!confirm("Usunąć święto?")) return;
    await pb.collection("holidays").delete(id);
    await qc.invalidateQueries({ queryKey: ["holidays"] });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={addHoliday} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="font-medium">Dodaj święto</h2>
        <div>
          <label className="label">Data</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">Nazwa (opcjonalnie)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">
          Dodaj
        </button>
      </form>

      <ul className="divide-y rounded-xl border bg-white shadow-sm">
        {holidays.map((h) => (
          <li key={h.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium">
                {format(parseISO(normalizePbDate(h.date)), "d MMMM yyyy", { locale: pl })}
              </p>
              {h.name && <p className="text-sm text-slate-500">{h.name}</p>}
            </div>
            <button type="button" className="btn-danger text-xs" onClick={() => remove(h.id)}>
              Usuń
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
