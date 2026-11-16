import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import { formatPbError } from "@/lib/pbError";
import type { Shift, ShiftType } from "@/lib/types";

export interface ShiftDialogProps {
  open: boolean;
  date: string;
  userId: string;
  calendarId: string;
  existing?: Shift | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ShiftDialog({ open, date, userId, calendarId, existing, onClose, onSaved }: ShiftDialogProps) {
  const [shiftTypeId, setShiftTypeId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: types = [] } = useQuery({
    queryKey: ["shift_types", calendarId],
    queryFn: () =>
      pb.collection("shift_types").getFullList<ShiftType>({
        filter: `calendar = ${JSON.stringify(calendarId)}`,
        sort: "name",
      }),
    enabled: open && !!calendarId,
  });

  const allowedTypes = useMemo(() => {
    return types.filter((t) => {
      const allowed = t.allowedUsers;
      if (!allowed || !allowed.length) return true;
      return allowed.includes(userId);
    });
  }, [types, userId]);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      const typeRef = existing.shiftType;
      setShiftTypeId(
        typeof typeRef === "string"
          ? typeRef
          : typeof typeRef === "object" && typeRef && "id" in typeRef
            ? String((typeRef as { id: string }).id)
            : ""
      );
      setStartTime(existing.startTime ?? "");
      setEndTime(existing.endTime ?? "");
    } else if (allowedTypes.length) {
      const first = allowedTypes[0];
      setShiftTypeId(first.id);
      setStartTime(first.defaultStart ?? "");
      setEndTime(first.defaultEnd ?? "");
    }
    setError(null);
  }, [open, existing, allowedTypes]);

  useEffect(() => {
    const t = types.find((x) => x.id === shiftTypeId);
    if (!t || existing) return;
    if (!startTime && t.defaultStart) setStartTime(t.defaultStart);
    if (!endTime && t.defaultEnd) setEndTime(t.defaultEnd);
  }, [shiftTypeId, types, existing, startTime, endTime]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!shiftTypeId) {
      setError("Wybierz typ zmiany.");
      return;
    }

    const day = date.slice(0, 10);
    const body: {
      user: string;
      date: string;
      shiftType: string;
      calendar: string;
      startTime?: string;
      endTime?: string;
    } = {
      user: userId,
      date: `${day} 00:00:00.000Z`,
      shiftType: shiftTypeId,
      calendar: calendarId,
    };
    if (startTime.trim()) body.startTime = startTime.trim();
    if (endTime.trim()) body.endTime = endTime.trim();
    try {
      if (existing) {
        await pb.collection("shifts").update(existing.id, body);
      } else {
        await pb.collection("shifts").create(body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(formatPbError(err, "Nie udało się zapisać zmiany."));
      console.error(err);
    }
  }

  async function onDelete() {
    if (!existing || !confirm("Usunąć tę zmianę?")) return;
    try {
      await pb.collection("shifts").delete(existing.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(formatPbError(err, "Nie udało się usunąć."));
      console.error(err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" role="dialog" aria-modal="true">
        <h2 className="mb-4 text-lg font-semibold">{existing ? "Edycja zmiany" : "Nowa zmiana"}</h2>
        <p className="mb-4 text-sm text-slate-600">Data: {date}</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Typ zmiany</label>
            <select className="input" value={shiftTypeId} onChange={(e) => setShiftTypeId(e.target.value)} required>
              {allowedTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.abbreviation})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Od</label>
              <input className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} placeholder="08:00" />
            </div>
            <div>
              <label className="label">Do</label>
              <input className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="16:00" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="btn-primary">
              Zapisz
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Anuluj
            </button>
            {existing && (
              <button type="button" className="btn-danger ml-auto" onClick={onDelete}>
                Usuń
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
