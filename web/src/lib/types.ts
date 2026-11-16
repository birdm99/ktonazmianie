import type { RecordModel } from "pocketbase";

export type UserRole = "admin" | "employee" | "superadmin";

export interface Calendar extends RecordModel {
  name: string;
  description?: string;
}

export interface User extends RecordModel {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  calendar?: string;
  expand?: {
    calendar?: Calendar;
  };
}

export interface ShiftType extends RecordModel {
  name: string;
  abbreviation: string;
  defaultStart?: string;
  defaultEnd?: string;
  isFree?: boolean;
  color: string;
  allowedUsers?: string[];
  calendar: string;
}

export interface Shift extends RecordModel {
  user: string;
  date: string;
  shiftType: string;
  calendar: string;
  startTime?: string;
  endTime?: string;
  expand?: {
    user?: User;
    shiftType?: ShiftType;
  };
}

export interface Holiday extends RecordModel {
  date: string;
  name?: string;
}

export type CalendarView = "week" | "month";