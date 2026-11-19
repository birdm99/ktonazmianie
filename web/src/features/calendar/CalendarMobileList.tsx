import { useMemo } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  columnClass,
  formatWeekday2L,
  isToday,
  normalizePbDate,
  toDateKey,
} from "@/lib/dates";
import type { CalendarView, Shift, ShiftType, User } from "@/lib/types";

export interface CalendarMobileListProps {
  days: Date[];
  users: User[];
  shifts: Shift[];
  shiftTypes: Map<string, ShiftType>;
  holidays: Set<string>;
  view: CalendarView;
  currentUserId: string;
  isAdmin: boolean;
  onCellClick: (userId: string, date: string, shift?: Shift) => void;
}

export function CalendarMobileList({
  days,
  users,
  shifts,
  shiftTypes,
  holidays,
  view,
  currentUserId,
  isAdmin,
  onCellClick,
}: CalendarMobileListProps) {
  const shiftMap = useMemo(() => {
    const map = new Map<string, Shift>();
    for (const s of shifts) {
      const userId = typeof s.user === "string" ? s.user : s.user;
      map.set(`${userId}|${normalizePbDate(s.date)}`, s);
    }
    return map;
  }, [shifts]);

  return (
    <div className="space-y-3 print:hidden">
      {days.map((d) => {
        const dateKey = toDateKey(d);
        const dayBg = columnClass(d, holidays);
        const today = isToday(d);

        return (
          <section
            key={dateKey}
            className={clsx(
              "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm",
              today && "ring-2 ring-sky-400 ring-offset-1"
            )}
          >
            <header
              className={clsx(
                "flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5",
                dayBg === "bg-holiday" && "bg-holiday",
                dayBg === "bg-weekend" && "bg-weekend",
                dayBg === "bg-white" && "bg-slate-50",
                today && "bg-sky-50"
              )}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {formatWeekday2L(d)}
                </p>
                <p className="text-base font-bold capitalize text-slate-900">
                  {format(d, "d MMMM", { locale: pl })}
                </p>
              </div>
              {today ? (
                <span className="shrink-0 rounded-full bg-sky-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  Dziś
                </span>
              ) : null}
            </header>
            <ul className="divide-y divide-slate-100">
              {users.map((u) => {
                const key = `${u.id}|${dateKey}`;
                const shift = shiftMap.get(key);
                const shiftType = shift ? shiftTypes.get(shift.shiftType) : undefined;
                const canEdit = u.id === currentUserId || isAdmin;

                return (
                  <li key={key}>
                    <MobileShiftRow
                      user={u}
                      shift={shift}
                      shiftType={shiftType}
                      view={view}
                      canEdit={canEdit}
                      onClick={() => onCellClick(u.id, dateKey, shift)}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function MobileShiftRow({
  user,
  shift,
  shiftType,
  view,
  canEdit,
  onClick,
}: {
  user: User;
  shift?: Shift;
  shiftType?: ShiftType;
  view: CalendarView;
  canEdit: boolean;
  onClick: () => void;
}) {
  const abbr = shiftType?.abbreviation ?? "?";
  const bg = shiftType?.color ?? "#64748b";

  const inner = (
    <>
      <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
        {user.firstName} {user.lastName}
      </span>
      {shift ? (
        <div className="flex max-w-[55%] shrink-0 flex-col items-end gap-0.5 text-right">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold text-black"
            style={{ backgroundColor: bg }}
          >
            <span className="tabular-nums">{abbr}</span>
          </span>
          {view === "week" && (
            <span className="text-xs font-medium tabular-nums text-slate-600">
              {shiftType?.isFree
                ? "Cały dzień"
                : shift.startTime || shift.endTime
                  ? `${shift.startTime || "—"} – ${shift.endTime || "—"}`
                  : shiftType?.name}
            </span>
          )}
          {view === "month" && (
            <span className="line-clamp-1 text-xs font-medium text-slate-600">{shiftType?.name}</span>
          )}
        </div>
      ) : canEdit ? (
        <span className="shrink-0 text-sm font-medium text-slate-400">+ dodaj</span>
      ) : (
        <span className="shrink-0 text-sm text-slate-300">—</span>
      )}
    </>
  );

  if (!canEdit) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2.5" aria-label={`${user.firstName} ${user.lastName}`}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-amber-50/80 active:bg-amber-100/60"
      onClick={onClick}
      aria-label={
        shift
          ? `${user.firstName} ${user.lastName}, ${shiftType?.name ?? abbr}`
          : `${user.firstName} ${user.lastName}, dodaj zmianę`
      }
    >
      {inner}
    </button>
  );
}