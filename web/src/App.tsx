import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { AdminLayout } from "./features/admin/AdminLayout";
import { ShiftTypesAdmin } from "./features/admin/ShiftTypesAdmin";
import { HolidaysAdmin } from "./features/admin/HolidaysAdmin";
import { CalendarsAdmin } from "./features/admin/CalendarsAdmin";
import { UsersAdmin } from "./features/admin/UsersAdmin";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="shift-types" replace />} />
        <Route path="shift-types" element={<ShiftTypesAdmin />} />
        <Route path="holidays" element={<HolidaysAdmin />} />
        <Route path="calendars" element={<CalendarsAdmin />} />
        <Route path="users" element={<UsersAdmin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
