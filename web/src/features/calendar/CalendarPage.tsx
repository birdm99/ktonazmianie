import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { pb } from "@/lib/pocketbase";
import { filterByCalendar } from "@/lib/calendarFilter";
import type { CalendarView, Holiday, Shift, ShiftType, User } from "@/lib/types";
import {
  daysInView,
  formatPeriodTitle,
  normalizePbDate,
  shiftAnchor,
  shiftsFilterForRange,
} from "@/lib/dates";
import { isCalendarAdmin } from "@/lib/roles";
import { useActiveCalendar } from "@/lib/useActiveCalendar";
import { useAuth } from "../auth/AuthContext";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarPeriodNav } from "./CalendarPeriodNav";
import { CalendarGrid } from "./CalendarGrid";
import { ShiftDialog } from "../shifts/ShiftDialog";

export function CalendarPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const {
    activeCalendarId,
    activeCalendar,
    calendars,
    setSelectedId,
    superadmin,
    loading: calendarLoading,
    ready,
    needsCalendarAssignment,
  } = useActiveCalendar(user);

  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [filterUserQuery, setFilterUserQuery] = useState("");
  const [filterTypeId, setFilterTypeId] = useState("");
  const [dialog, setDialog] = useState<{
    userId: string;
    date: string;
    shift?: Shift | null;
  } | null>(null);

  const days = useMemo(() => daysInView(anchor, view), [anchor, view]);
  const rangeStart = format(days[0], "yyyy-MM-dd");
  const rangeEnd = format(days[days.length - 1], "yyyy-MM-dd");

  const calendarFilter = ready ? filterByCalendar(activeCalendarId) : "";

  const { data: users = [] } = useQuery({
    queryKey: ["users", activeCalendarId],
    queryFn: () =>
      pb.collection("users").getFullList<User>({
        filter: calendarFilter,
        sort: "lastName",
        fields: "id,firstName,lastName,role,calendar",
      }),
    enabled: ready,
  });

  const { data: shiftTypesList = [] } = useQuery({
    queryKey: ["shift_types", activeCalendarId],
    queryFn: () =>
      pb.collection("shift_types").getFullList<ShiftType>({
        filter: calendarFilter,
      }),
    enabled: ready,
  });

  const { data: holidaysList = [] } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => pb.collection("holidays").getFullList<Holiday>(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts", activeCalendarId, rangeStart, rangeEnd],
    queryFn: () =>
      pb.collection("shifts").getFullList<Shift>({
        filter: `${shiftsFilterForRange(rangeStart, rangeEnd)} && ${calendarFilter}`,
        expand: "shiftType",
      }),
    enabled: ready,
  });

  const holidays = useMemo(
    () => new Set(holidaysList.map((h) => normalizePbDate(h.date))),
    [holidaysList]
  );
  const shiftTypesMap = useMemo(() => new Map(shiftTypesList.map((t) => [t.id, t])), [shiftTypesList]);

  const filteredUsers = useMemo(() => {
    const q = filterUserQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const full = `${u.firstName} ${u.lastName}`.toLowerCase();
      return full.includes(q) || u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q);
    });
  }, [users, filterUserQuery]);

  const visibleUserIds = useMemo(() => new Set(filteredUsers.map((u) => u.id)), [filteredUsers]);

  const filteredShifts = shifts.filter((s) => {
    if (filterUserQuery.trim() && !visibleUserIds.has(s.user)) return false;
    if (filterTypeId && s.shiftType !== filterTypeId) return false;
    return true;
  });

  const canManageShifts = isCalendarAdmin(user?.role);

  function onCellClick(userId: string, date: string, shift?: Shift) {
    const isOwn = userId === user?.id;
    if (!isOwn && !canManageShifts) return;
    if (!shift && !isOwn && !canManageShifts) return;
    setDialog({ userId, date, shift });
  }

  if (needsCalendarAssignment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl border bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Brak przypisanego kalendarza</h1>
          <p className="mt-2 text-sm text-slate-600">
            Konto nie ma przypisanego kalendarza grafiku. Skontaktuj się z administratorem systemu.
          </p>
        </div>
      </div>
    );
  }

  if (calendarLoading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Ładowanie kalendarza…
      </div>
    );
  }

  const calendarName = activeCalendar?.name ?? "Kalendarz";
  const periodTitle = formatPeriodTitle(anchor, view);

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="print:hidden">
        <CalendarHeader
          view={view}
          onViewChange={setView}
          shiftTypes={shiftTypesList}
          filterUserQuery={filterUserQuery}
          filterTypeId={filterTypeId}
          onFilterUserQuery={setFilterUserQuery}
          onFilterType={setFilterTypeId}
          calendarName={calendarName}
          calendars={superadmin ? calendars : undefined}
          activeCalendarId={activeCalendarId}
          onCalendarChange={setSelectedId}
        />
      </div>
      <main className="mx-auto max-w-full px-2 py-2 sm:px-4 sm:py-4 print:px-0 print:py-0">
        <header className="mb-4 hidden text-center print:block">
          <p className="text-xl font-bold text-slate-900">{calendarName}</p>
          <p className="mt-1 text-lg font-semibold capitalize text-slate-800">{periodTitle}</p>
        </header>
        <CalendarPeriodNav
          anchor={anchor}
          view={view}
          onPrev={() => setAnchor((d) => shiftAnchor(d, view, -1))}
          onNext={() => setAnchor((d) => shiftAnchor(d, view, 1))}
          onPrint={() => window.print()}
        />
        <CalendarGrid
          days={days}
          users={filteredUsers}
          shifts={filteredShifts}
          shiftTypes={shiftTypesMap}
          holidays={holidays}
          view={view}
          currentUserId={user?.id ?? ""}
          isAdmin={canManageShifts}
          onCellClick={onCellClick}
        />
      </main>
      <ShiftDialog
        open={!!dialog}
        date={dialog?.date ?? ""}
        userId={dialog?.userId ?? ""}
        calendarId={activeCalendarId}
        existing={dialog?.shift}
        onClose={() => setDialog(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["shifts"] })}
      />
    </div>
  );
}