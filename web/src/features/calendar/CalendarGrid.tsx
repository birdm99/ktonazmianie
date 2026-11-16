import { useMemo, type KeyboardEvent } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import {
  columnClass,
  formatWeekday2L,
  headerColumnClass,
  isToday,
  normalizePbDate,
  toDateKey,
} from "@/lib/dates";
import { formatWorkedHours, sumWorkedMinutesByUser } from "@/lib/shiftHours";
import type { CalendarView, Shift, ShiftType, User } from "@/lib/types";

export interface CalendarGridProps {
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

export function CalendarGrid({
  days,
  users,
  shifts,
  shiftTypes,
  holidays,
  view,
  currentUserId,
  isAdmin,
  onCellClick,
}: CalendarGridProps) {
  const shiftMap = new Map<string, Shift>();
  for (const s of shifts) {
    const userId = typeof s.user === "string" ? s.user : s.user;
    shiftMap.set(`${userId}|${normalizePbDate(s.date)}`, s);
  }

  const workedMinutesByUser = useMemo(
    () => sumWorkedMinutesByUser(shifts, shiftTypes),
    [shifts, shiftTypes]
  );

  const compactMonth = view === "month";
  const rowMinH = compactMonth ? "min-h-[2.75rem]" : "min-h-[3.25rem]";
  const nameColW = compactMonth ? "w-[11.5rem]" : "w-[13rem]";
  const dayColDivider = "border-l border-slate-200";
  const nameColSticky =
    "sticky left-0 z-20 border-r-2 border-slate-300 shadow-[6px_0_14px_-6px_rgba(15,23,42,0.2)] print:static print:shadow-none";

  return (
    <div className="rounded-lg border bg-white shadow-sm print:rounded-none print:shadow-none print:border-slate-400">
      <table className="w-full table-fixed border-collapse text-xs">
        <colgroup>
          <col className={nameColW} />
          {days.map((d) => (
            <col key={toDateKey(d)} />
          ))}
        </colgroup>
        <thead className="isolate">
          <tr className="border-b-2 border-slate-300 shadow-[0_4px_6px_-4px_rgba(15,23,42,0.15)] print:shadow-none">
            <th
              className={clsx(
                nameColSticky,
                "z-30 bg-gradient-to-br from-slate-200/80 via-slate-100 to-slate-50 px-3 py-2.5 text-left"
              )}
            >
              <span className="text-sm font-bold text-slate-800">Pracownik</span>
            </th>
            {days.map((d) => (
              <th
                key={toDateKey(d)}
                className={clsx(
                  dayColDivider,
                  "px-0 py-2 text-center font-medium leading-tight",
                  headerColumnClass(d, holidays),
                  isToday(d) && "bg-sky-50 ring-2 ring-inset ring-sky-400 print:ring-0 print:bg-transparent"
                )}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="w-[2.25rem] text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {formatWeekday2L(d)}
                  </span>
                  <span
                    className={clsx(
                      "inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md text-sm font-bold tabular-nums",
                      isToday(d)
                        ? "bg-sky-600 text-white shadow-sm print:bg-transparent print:text-slate-800 print:shadow-none"
                        : "text-slate-800"
                    )}
                  >
                    {format(d, "d")}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u, rowIndex) => {
            const workedMinutes = workedMinutesByUser.get(u.id) ?? 0;
            return (
            <tr key={u.id} className={rowIndex === 0 ? "border-t border-slate-200" : "border-t border-slate-100"}>
              <td
                className={clsx(
                  nameColSticky,
                  compactMonth ? "px-2.5 py-2" : "px-2.5 py-1",
                  rowIndex % 2 === 0 ? "bg-slate-50" : "bg-slate-100/80"
                )}
              >
                <div className={clsx("flex flex-col justify-center gap-0.5", rowMinH)}>
                  <p className="m-0 whitespace-normal break-words text-sm font-semibold leading-snug text-slate-800">
                    {u.firstName} {u.lastName}
                  </p>
                  {workedMinutes > 0 ? (
                    <p className="m-0 text-[10px] font-medium tabular-nums leading-tight text-slate-500 print:hidden">
                      {formatWorkedHours(workedMinutes)} przepracowane
                    </p>
                  ) : null}
                </div>
              </td>
              {days.map((d) => {
                const dateKey = toDateKey(d);
                const key = `${u.id}|${dateKey}`;
                const shift = shiftMap.get(key);
                const canEdit = u.id === currentUserId || isAdmin;
                return (
                  <CalendarCell
                    key={key}
                    date={d}
                    holidays={holidays}
                    shift={shift}
                    shiftType={shift ? shiftTypes.get(shift.shiftType) : undefined}
                    view={view}
                    rowMinH={rowMinH}
                    canEdit={canEdit}
                    onClick={() => onCellClick(u.id, dateKey, shift)}
                  />
                );
              })}
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CalendarCell({
  date,
  holidays,
  shift,
  shiftType,
  view,
  rowMinH,
  canEdit,
  onClick,
}: {
  date: Date;
  holidays: Set<string>;
  shift?: Shift;
  shiftType?: ShiftType;
  view: CalendarView;
  rowMinH: string;
  canEdit: boolean;
  onClick: () => void;
}) {
  const bg = shiftType?.color ?? "#64748b";
  const abbr = shiftType?.abbreviation ?? "?";

  const tdClass = clsx(
    "h-px border-l border-slate-200 p-0 text-center align-middle",
    !shift && columnClass(date, holidays),
    isToday(date) && "ring-2 ring-inset ring-sky-300 print:ring-0",
    canEdit && "cursor-pointer print:cursor-default",
    !shift && canEdit && "hover:bg-amber-50/90 print:hover:bg-transparent"
  );

  const cellStyle = shift ? { backgroundColor: bg } : undefined;

  const handleKeyDown = (e: KeyboardEvent<HTMLTableCellElement>) => {
    if (!canEdit) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  if (!shift) {
    return (
      <td
        className={tdClass}
        style={cellStyle}
        role={canEdit ? "button" : undefined}
        tabIndex={canEdit ? 0 : undefined}
        onClick={canEdit ? onClick : undefined}
        onKeyDown={handleKeyDown}
        aria-label={canEdit ? "Dodaj zmianę" : undefined}
      >
        <div className={clsx("flex items-center justify-center text-slate-400", rowMinH)}>
          {canEdit ? <span className="print:hidden">+</span> : null}
        </div>
      </td>
    );
  }

  return (
    <td
      className={clsx(tdClass, !canEdit && "opacity-90")}
      style={cellStyle}
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onClick={canEdit ? onClick : undefined}
      onKeyDown={handleKeyDown}
      aria-label={`Zmiana ${shiftType?.name ?? abbr}`}
    >
      <div
        className={clsx(
          "flex flex-col justify-center text-black",
          rowMinH,
          view === "week"
            ? "items-start gap-px px-1 py-1 text-left leading-tight"
            : "items-center px-0.5 py-1 text-xs font-bold leading-none"
        )}
      >
        {view === "week" ? (
          <>
            <span className="line-clamp-2 text-sm font-bold">{shiftType?.name ?? "—"}</span>
            {shiftType?.isFree ? (
              <span className="text-sm font-medium text-black/85">Cały dzień</span>
            ) : (shift.startTime || shift.endTime) ? (
              <span className="text-sm font-medium tabular-nums text-black/85">
                {shift.startTime || "—"} – {shift.endTime || "—"}
              </span>
            ) : null}
          </>
        ) : (
          <span>{abbr}</span>
        )}
      </div>
    </td>
  );
}
