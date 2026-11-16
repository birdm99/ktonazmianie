import type { Shift, ShiftType } from "@/lib/types";

/** Parsuje HH:mm lub H:mm na minuty od północy. */
export function parseTimeToMinutes(time: string): number | null {
  const t = time.trim();
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function resolveShiftTypeId(shift: Shift): string {
  const ref = shift.shiftType;
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && ref && "id" in ref) return String((ref as { id: string }).id);
  return "";
}

function resolveUserId(shift: Shift): string {
  const ref = shift.user;
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && ref && "id" in ref) return String((ref as { id: string }).id);
  return "";
}

/** Długość zmiany w minutach; null gdy urlop/wolne lub brak sensownych godzin. */
export function shiftDurationMinutes(shift: Shift, shiftType?: ShiftType): number | null {
  const type = shiftType ?? shift.expand?.shiftType;
  if (type?.isFree) return null;

  const startRaw = shift.startTime?.trim() || type?.defaultStart?.trim() || "";
  const endRaw = shift.endTime?.trim() || type?.defaultEnd?.trim() || "";
  const start = parseTimeToMinutes(startRaw);
  const end = parseTimeToMinutes(endRaw);
  if (start === null || end === null) return null;

  let delta = end - start;
  if (delta <= 0) delta += 24 * 60;
  return delta;
}

export function sumWorkedMinutesByUser(
  shifts: Shift[],
  shiftTypes: Map<string, ShiftType>
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const shift of shifts) {
    const userId = resolveUserId(shift);
    if (!userId) continue;
    const typeId = resolveShiftTypeId(shift);
    const shiftType = shiftTypes.get(typeId) ?? shift.expand?.shiftType;
    const minutes = shiftDurationMinutes(shift, shiftType);
    if (minutes === null || minutes <= 0) continue;
    totals.set(userId, (totals.get(userId) ?? 0) + minutes);
  }
  return totals;
}

export function formatWorkedHours(totalMinutes: number): string {
  const hours = totalMinutes / 60;
  const rounded = Math.round(hours * 10) / 10;
  const text =
    Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
  return `${text} h`;
}
