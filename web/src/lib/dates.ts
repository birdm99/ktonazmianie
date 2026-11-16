import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWeekend,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { pl } from "date-fns/locale";

export const weekOpts = { weekStartsOn: 1 as const, locale: pl };

export function formatPeriodTitle(date: Date, view: "week" | "month"): string {
  if (view === "month") {
    return format(date, "LLLL yyyy", { locale: pl });
  }
  const start = startOfWeek(date, weekOpts);
  const end = endOfWeek(date, weekOpts);
  return `${format(start, "d MMM", { locale: pl })} – ${format(end, "d MMM yyyy", { locale: pl })}`;
}

export function daysInView(anchor: Date, view: "week" | "month"): Date[] {
  if (view === "week") {
    const start = startOfWeek(anchor, weekOpts);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  const start = startOfMonth(anchor);
  const end = endOfMonth(anchor);
  const days: Date[] = [];
  let d = start;
  while (d <= end) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

export function shiftAnchor(anchor: Date, view: "week" | "month", dir: 1 | -1): Date {
  return view === "week" ? addWeeks(anchor, dir) : addMonths(anchor, dir);
}

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Filtr PocketBase dla pola `date` — obejmuje cały dzień końcowy (włącznie z 30./31.). */
export function shiftsFilterForRange(rangeStart: string, rangeEnd: string): string {
  const endExclusive = format(addDays(parseISO(rangeEnd), 1), "yyyy-MM-dd");
  return `date >= "${rangeStart} 00:00:00.000Z" && date < "${endExclusive} 00:00:00.000Z"`;
}

/** PocketBase pola `date` zwracają czasem pełny timestamp UTC. */
export function normalizePbDate(value: string): string {
  if (!value) return value;
  const key = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  return format(parseISO(value), "yyyy-MM-dd");
}

export function parseDateKey(key: string): Date {
  return parseISO(key);
}

export function columnClass(date: Date, holidayDates: Set<string>): string {
  const key = toDateKey(date);
  if (holidayDates.has(key)) return "bg-holiday";
  if (isWeekend(date)) return "bg-weekend";
  return "bg-white";
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** Dwuliterowe skróty dni (ndz. → pon., indeks jak w `Date#getDay()`). */
const WEEKDAY_LABELS_2L = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"] as const;

export function formatWeekday2L(date: Date): string {
  return WEEKDAY_LABELS_2L[date.getDay()];
}

export function headerColumnClass(date: Date, holidayDates: Set<string>): string {
  const key = toDateKey(date);
  if (holidayDates.has(key)) return "bg-rose-50";
  if (isWeekend(date)) return "bg-slate-100/90";
  return "bg-gradient-to-b from-slate-50 to-slate-100/80";
}
