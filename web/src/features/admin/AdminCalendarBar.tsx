import { useAuth } from "@/features/auth/AuthContext";
import { useActiveCalendar } from "@/lib/useActiveCalendar";
import { isSuperadmin } from "@/lib/roles";

export function AdminCalendarBar() {
  const { user } = useAuth();
  const { calendars, activeCalendarId, setSelectedId, activeCalendar, ready } = useActiveCalendar(user);

  if (!isSuperadmin(user?.role) || !ready) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm">
      <span className="font-medium text-sky-900">Kontekst kalendarza:</span>
      {calendars.length > 0 ? (
        <select
          className="input h-9 min-w-[14rem] py-0"
          value={activeCalendarId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-slate-600">Brak kalendarzy — utwórz kalendarz w zakładce „Kalendarze”.</span>
      )}
      {activeCalendar && <span className="text-slate-600">Typy zmian dotyczą: {activeCalendar.name}</span>}
    </div>
  );
}