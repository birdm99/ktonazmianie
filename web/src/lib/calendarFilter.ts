export function filterByCalendar(calendarId: string): string {
  return `calendar = ${JSON.stringify(calendarId)}`;
}