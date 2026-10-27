import { DEFAULT_MEMBER_WEEKLY_ATTENDANCE_TARGET } from "@/lib/member-portal/member-dashboard-goals";

/** @deprecated use {@link DEFAULT_MEMBER_WEEKLY_ATTENDANCE_TARGET} */
export const WEEKLY_ATTENDANCE_DISPLAY_BENCHMARK =
  DEFAULT_MEMBER_WEEKLY_ATTENDANCE_TARGET;

export function weeklyAttendanceDisplayProgress(
  visitsThisWeek: number,
  weeklyTarget: number = DEFAULT_MEMBER_WEEKLY_ATTENDANCE_TARGET,
): {
  visits: number;
  benchmark: number;
  remaining: number;
  percent: number;
} {
  const benchmark = Math.max(1, Math.min(7, Math.round(weeklyTarget)));
  const visits = Math.max(0, visitsThisWeek);
  const remaining = Math.max(0, benchmark - visits);
  const percent = Math.min(100, (visits / benchmark) * 100);
  return { visits, benchmark, remaining, percent };
}
