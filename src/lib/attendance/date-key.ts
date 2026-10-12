/** Default calendar timezone for attendance dateKey (India gyms). */
export const ATTENDANCE_GYM_TIMEZONE =
  process.env.GYMDESK_GYM_TIMEZONE ?? "Asia/Kolkata";

/** YYYY-MM-DD in the gym's local timezone. */
export function attendanceDateKey(
  date: Date = new Date(),
  timeZone: string = ATTENDANCE_GYM_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Monday = 0 … Sunday = 6 for a YYYY-MM-DD key. */
export function weekdayMon0FromDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (jsDay + 6) % 7;
}

export function shiftAttendanceDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeekDateKey(dateKey: string): string {
  const offset = weekdayMon0FromDateKey(dateKey);
  return shiftAttendanceDateKey(dateKey, -offset);
}

export function endOfWeekDateKey(dateKey: string): string {
  const start = startOfWeekDateKey(dateKey);
  return shiftAttendanceDateKey(start, 6);
}

export function monthBoundsDateKeys(
  year: number,
  monthIndex0: number,
): { start: string; end: string } {
  const start = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const end = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
