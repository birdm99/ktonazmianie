import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { isCalendarAdmin, isSuperadmin } from "@/lib/roles";
import clsx from "clsx";
import { AdminCalendarBar } from "./AdminCalendarBar";

const superTabs = [
  { to: "/admin/shift-types", label: "Typy zmian" },
  { to: "/admin/holidays", label: "Święta" },
  { to: "/admin/calendars", label: "Kalendarze" },
  { to: "/admin/users", label: "Użytkownicy" },
];

const adminTabs = [{ to: "/admin/shift-types", label: "Typy zmian" }];

export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const superadmin = isSuperadmin(user?.role);

  if (!isCalendarAdmin(user?.role)) {
    return <Navigate to="/" replace />;
  }

  if (!superadmin && location.pathname !== "/admin/shift-types") {
    return <Navigate to="/admin/shift-types" replace />;
  }

  const tabs = superadmin ? superTabs : adminTabs;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Panel administracyjny</h1>
          <Link to="/" className="text-sm text-sky-600 hover:underline">
            Kalendarz
          </Link>
        </div>
        <nav className="mx-auto mt-3 flex max-w-5xl flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm",
                location.pathname === tab.to ? "bg-sky-100 text-sky-800" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <AdminCalendarBar />
        <Outlet />
      </main>
    </div>
  );
}