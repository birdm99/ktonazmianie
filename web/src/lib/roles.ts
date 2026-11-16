import type { User, UserRole } from "./types";

export function isSuperadmin(role?: UserRole): boolean {
  return role === "superadmin";
}

export function isCalendarAdmin(role?: UserRole): boolean {
  return role === "admin" || role === "superadmin";
}

export function resolveCalendarId(user: User | null | undefined): string {
  const cal = user?.calendar;
  if (!cal) return "";
  return typeof cal === "string" ? cal : String(cal);
}