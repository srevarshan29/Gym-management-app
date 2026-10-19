/**
 * Display-only weekly visit benchmark when no gym/member attendance goal exists.
 * Not persisted and not presented as a user-configured target.
 */
export const WEEKLY_ATTENDANCE_DISPLAY_BENCHMARK = 5;

export function weeklyAttendanceDisplayProgress(visitsThisWeek: number): {
  visits: number;
  benchmark: number;
  remaining: number;
  percent: number;
} {
  const benchmark = WEEKLY_ATTENDANCE_DISPLAY_BENCHMARK;
  const visits = Math.max(0, visitsThisWeek);
  const remaining = Math.max(0, benchmark - visits);
  const percent = Math.min(100, (visits / Math.max(1, benchmark)) * 100);
  return { visits, benchmark, remaining, percent };
}
