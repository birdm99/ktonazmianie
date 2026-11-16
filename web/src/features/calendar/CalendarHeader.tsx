import { Link } from "react-router-dom";
import clsx from "clsx";
import type { Calendar, CalendarView, ShiftType } from "@/lib/types";
import { isCalendarAdmin, isSuperadmin } from "@/lib/roles";
import { useAuth } from "../auth/AuthContext";

export interface CalendarHeaderProps {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  shiftTypes: ShiftType[];
  filterUserQuery: string;
  filterTypeId: string;
  onFilterUserQuery: (query: string) => void;
  onFilterType: (id: string) => void;
  calendarName: string;
  calendars?: Calendar[];
  activeCalendarId?: string;
  onCalendarChange?: (id: string) => void;
}

const controlH = "h-10";

function ViewToggle({ view, onViewChange }: { view: CalendarView; onViewChange: (v: CalendarView) => void }) {
  return (
    <div
      className={clsx(
        "inline-flex shrink-0 rounded-lg border border-slate-300 bg-slate-50 p-1",
        controlH
      )}
      role="group"
      aria-label="Widok kalendarza"
    >
      {(
        [
          ["month", "Miesiąc"],
          ["week", "Tydzień"],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          className={clsx(
            "flex min-w-[5.25rem] items-center justify-center rounded-md px-3 text-sm font-semibold transition",
            view === v
              ? "bg-white text-sky-800 shadow-sm ring-1 ring-slate-200"
              : "text-slate-600 hover:text-slate-900"
          )}
          aria-pressed={view === v}
          onClick={() => onViewChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function UserToolbar({
  displayName,
  showAdminLink,
  onLogout,
}: {
  displayName: string;
  showAdminLink: boolean;
  onLogout: () => void;
}) {
  const linkClass =
    "flex h-full items-center justify-center whitespace-nowrap px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900";

  return (
    <div
      className={clsx(
        "flex w-full min-w-0 items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white text-sm shadow-sm sm:w-auto",
        controlH
      )}
    >
      <span
        className="flex min-w-0 flex-1 items-center justify-center border-r border-slate-200 bg-slate-50 px-3 font-semibold text-slate-900 sm:max-w-[11rem] sm:flex-none"
        title={displayName}
      >
        <span className="truncate">{displayName}</span>
      </span>
      <Link to="/settings" className={clsx(linkClass, "border-r border-slate-200")}>
        Ustawienia
      </Link>
      {showAdminLink && (
        <Link to="/admin" className={clsx(linkClass, "border-r border-slate-200")}>
          Administracja
        </Link>
      )}
      <button type="button" className={linkClass} onClick={onLogout}>
        Wyloguj
      </button>
    </div>
  );
}

export function CalendarHeader({
  view,
  onViewChange,
  shiftTypes,
  filterUserQuery,
  filterTypeId,
  onFilterUserQuery,
  onFilterType,
  calendarName,
  calendars,
  activeCalendarId,
  onCalendarChange,
}: CalendarHeaderProps) {
  const { user, logout } = useAuth();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Konto";
  const showAdminLink = isCalendarAdmin(user?.role);
  const superadmin = isSuperadmin(user?.role);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto max-w-full px-3 sm:px-4">
        <div className="border-b border-slate-100 py-2">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-between">
            <p className="text-sm font-semibold text-slate-800">
              {superadmin && calendars && calendars.length > 0 && onCalendarChange ? (
                <label className="inline-flex items-center gap-2">
                  <span className="text-slate-500">Kalendarz:</span>
                  <select
                    className="input h-9 min-w-[12rem] py-0 text-sm font-semibold"
                    value={activeCalendarId ?? ""}
                    onChange={(e) => onCalendarChange(e.target.value)}
                  >
                    {calendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span title={calendarName}>Grafik: {calendarName}</span>
              )}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 items-center gap-3 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-4">
          <div className="flex justify-center md:justify-start">
            <ViewToggle view={view} onViewChange={onViewChange} />
          </div>

          <label className="relative w-full min-w-0 md:max-w-md md:justify-self-center">
            <span className="sr-only">Szukaj pracownika</span>
            <input
              type="search"
              className={clsx("input w-full py-0 pl-9 pr-3", controlH)}
              placeholder="Szukaj pracownika…"
              value={filterUserQuery}
              onChange={(e) => onFilterUserQuery(e.target.value)}
              autoComplete="off"
            />
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            >
              ⌕
            </span>
          </label>

          <div className="flex justify-center md:justify-end">
            <UserToolbar displayName={displayName} showAdminLink={showAdminLink} onLogout={logout} />
          </div>
        </div>

        <div className="border-t border-slate-100 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <span className="shrink-0 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 sm:w-28 sm:text-left">
              Typ zmiany
            </span>
            <div
              className="flex min-h-10 flex-wrap items-center justify-center gap-1.5 sm:min-h-0 sm:flex-1 sm:justify-start"
              role="group"
              aria-label="Filtr typu zmiany"
            >
              <FilterChip
                selected={!filterTypeId}
                label="Wszystkie"
                onClick={() => onFilterType("")}
                accent="sky"
              />
              {shiftTypes.map((t) => {
                const selected = filterTypeId === t.id;
                return (
                  <FilterChip
                    key={t.id}
                    selected={selected}
                    label={t.abbreviation || t.name}
                    title={t.name}
                    color={selected ? t.color : undefined}
                    onClick={() => onFilterType(selected ? "" : t.id)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function FilterChip({
  selected,
  label,
  title,
  color,
  accent,
  onClick,
}: {
  selected: boolean;
  label: string;
  title?: string;
  color?: string;
  accent?: "sky";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        "inline-flex h-9 min-w-[2.75rem] items-center justify-center rounded-full border px-3 text-sm font-semibold transition",
        selected && accent === "sky" && "border-sky-500 bg-sky-100 text-sky-950",
        selected && !accent && "border-slate-700 text-slate-900 shadow-sm ring-1 ring-slate-900/10",
        !selected && "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
      )}
      style={selected && color ? { backgroundColor: color } : undefined}
    >
      {label}
    </button>
  );
}
