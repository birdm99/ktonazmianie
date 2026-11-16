import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { pb } from "@/lib/pocketbase";
import { isSuperadmin, resolveCalendarId } from "@/lib/roles";
import type { Calendar, User } from "@/lib/types";

const STORAGE_KEY = "ktonazmianie.activeCalendarId";

export function useActiveCalendar(user: User | null) {
  const superadmin = isSuperadmin(user?.role);
  const ownCalendarId = resolveCalendarId(user);

  const { data: calendars = [], isLoading: calendarsLoading } = useQuery({
    queryKey: ["calendars"],
    queryFn: () => pb.collection("calendars").getFullList<Calendar>({ sort: "name" }),
    enabled: superadmin,
  });

  const [selectedId, setSelectedIdState] = useState(() =>
    superadmin ? localStorage.getItem(STORAGE_KEY) ?? "" : ""
  );

  const setSelectedId = useCallback(
    (id: string) => {
      setSelectedIdState(id);
      if (superadmin) localStorage.setItem(STORAGE_KEY, id);
    },
    [superadmin]
  );

  useEffect(() => {
    if (!superadmin) return;
    if (selectedId && calendars.some((c) => c.id === selectedId)) return;
    if (calendars[0]) setSelectedId(calendars[0].id);
  }, [superadmin, selectedId, calendars, setSelectedId]);

  const activeCalendarId = superadmin ? selectedId : ownCalendarId;

  const activeCalendar = useMemo(() => {
    if (superadmin) return calendars.find((c) => c.id === activeCalendarId);
    return user?.expand?.calendar;
  }, [superadmin, calendars, activeCalendarId, user?.expand?.calendar]);

  const loading = superadmin ? calendarsLoading : false;
  const ready = Boolean(activeCalendarId);

  return {
    activeCalendarId,
    activeCalendar,
    calendars,
    setSelectedId,
    superadmin,
    loading,
    ready,
    needsCalendarAssignment: !superadmin && !ownCalendarId,
  };
}