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
