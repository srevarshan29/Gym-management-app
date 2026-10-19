import {
  attendanceDateKey,
  endOfWeekDateKey,
  monthBoundsDateKeys,
  startOfWeekDateKey,
  shiftAttendanceDateKey,
} from "@/lib/attendance/date-key";
import { defaultNutritionLogDate } from "@/lib/nutrition/date-utils";
import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import { nutritionCalorieRingProgress } from "@/lib/nutrition/nutrition-calorie-ring-math";
import { loadMemberNutritionDay } from "@/lib/nutrition/member-day";
import {
  resolveDashboardMessage,
  type ResolvedDashboardMessage,
} from "@/lib/member-portal/dashboard-message-engine";
import { findTodayQualifyingCompletedSession } from "@/lib/workout-tracking/session-today";
import type { SuggestedWorkoutDay } from "@/lib/workout-tracking/types";
import { sumWaterLogMl, waterDayProgress } from "@/lib/water/water-progress";

export type MemberDashboardWeekDay = {
  dateKey: string;
  label: string;
  visited: boolean;
  isToday: boolean;
};

export type MemberPortalDashboardData = {
  dateKey: string;
  calories: number;
  calorieTarget: number | null;
  caloriePercent: number | null;
  calorieGoalComplete: boolean;
  waterConsumedMl: number;
  waterTargetMl: number;
  waterPercent: number;
  waterGoalComplete: boolean;
  message: ResolvedDashboardMessage;
  weekDays: MemberDashboardWeekDay[];
  visitsThisWeek: number;
  showWeeklyWorkoutProgress: false;
};

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function daysBetweenDateKeys(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split("-").map(Number);
  const [ty, tm, td] = toKey.split("-").map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export async function loadMemberPortalDashboard(
  ctx: MemberContext,
  suggestion: SuggestedWorkoutDay,
  memberName: string,
): Promise<MemberPortalDashboardData> {
  const dateKey = defaultNutritionLogDate();
  const {
    memberWaterLogs,
    memberPortalDashboardState,
    attendance,
  } = getRepositories();

  const weekStart = startOfWeekDateKey(dateKey);
  const weekEnd = endOfWeekDateKey(dateKey);

  const [
    nutritionDay,
    waterRows,
    dashboardState,
    weekVisitKeys,
    completedTodaySession,
  ] = await Promise.all([
    loadMemberNutritionDay(ctx, dateKey),
    memberWaterLogs.listForMemberOnDate(ctx, ctx.gymId, ctx.memberId, dateKey),
    memberPortalDashboardState.getForMember(ctx, ctx.gymId, ctx.memberId),
    attendance.listVisitDateKeysForMemberInRange(
      ctx,
      ctx.gymId,
      ctx.memberId,
      weekStart,
      weekEnd,
    ),
    findTodayQualifyingCompletedSession(ctx, ctx.gymId, ctx.memberId, dateKey),
  ]);

  const visitSet = new Set(weekVisitKeys);
  const weekDays: MemberDashboardWeekDay[] = WEEKDAY_LABELS.map((label, index) => {
    const key = shiftAttendanceDateKey(weekStart, index);
    return {
      dateKey: key,
      label,
      visited: visitSet.has(key),
      isToday: key === dateKey,
    };
  });

  const { displayCalories, displayTarget, percent } =
    nutritionCalorieRingProgress(
      nutritionDay.totals.calories,
      nutritionDay.targetCalories,
    );

  const calorieGoalComplete =
    displayTarget != null && displayCalories >= displayTarget;

  const waterConsumedMl = sumWaterLogMl(waterRows);
  const waterProgress = waterDayProgress(waterConsumedMl);

  const workoutCompletedToday = completedTodaySession != null;

  const message = resolveDashboardMessage({
    dateKey,
    memberId: ctx.memberId,
    memberName,
    suggestion,
    workoutCompletedToday,
    caloriePercent: displayTarget != null ? percent : null,
    calorieGoalComplete,
    waterPercent: waterProgress.percent,
    waterGoalComplete: waterProgress.goalComplete,
    waterRemainingMl: waterProgress.targetMl - waterProgress.consumedMl,
    recentMessageKeys: dashboardState?.recentMessageKeys ?? [],
    greetingDateKey: dashboardState?.greetingDateKey ?? null,
    greetingMessageKey: dashboardState?.greetingMessageKey ?? null,
    celebratedCalorieDateKey: dashboardState?.celebratedCalorieDateKey ?? null,
    celebratedWaterDateKey: dashboardState?.celebratedWaterDateKey ?? null,
  });

  await memberPortalDashboardState.mergeForMember(
    ctx,
    ctx.gymId,
    ctx.memberId,
    {
      recentMessageKeys: message.patchRecentMessageKeys,
      greetingDateKey: message.patchGreetingDateKey,
      greetingMessageKey: message.patchGreetingMessageKey,
      celebratedCalorieDateKey: message.patchCelebratedCalorieDateKey,
      celebratedWaterDateKey: message.patchCelebratedWaterDateKey,
    },
  );

  return {
    dateKey,
    calories: displayCalories,
    calorieTarget: displayTarget,
    caloriePercent: displayTarget != null ? Math.round(percent) : null,
    calorieGoalComplete,
    waterConsumedMl: waterProgress.consumedMl,
    waterTargetMl: waterProgress.targetMl,
    waterPercent: Math.round(waterProgress.percent),
    waterGoalComplete: waterProgress.goalComplete,
    message,
    weekDays,
    visitsThisWeek: weekVisitKeys.length,
    showWeeklyWorkoutProgress: false,
  };
}

export type MemberAttendanceMonthSummary = {
  year: number;
  monthIndex0: number;
  monthLabel: string;
  visitDateKeys: string[];
  visitCount: number;
  averageVisitsPerWeek: number;
};

export async function loadMemberAttendanceMonthSummary(
  ctx: MemberContext,
  year: number,
  monthIndex0: number,
): Promise<MemberAttendanceMonthSummary> {
  const { attendance } = getRepositories();
  const { start, end } = monthBoundsDateKeys(year, monthIndex0);
  const visitDateKeys = await attendance.listVisitDateKeysForMemberInRange(
    ctx,
    ctx.gymId,
    ctx.memberId,
    start,
    end,
  );

  const visitCount = visitDateKeys.length;
  const todayKey = defaultNutritionLogDate();
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);
  const isCurrentMonth =
    todayYear === year && todayMonth - 1 === monthIndex0;
  const elapsedDaysInMonth = isCurrentMonth
    ? Math.max(1, todayDay)
    : daysBetweenDateKeys(start, end) + 1;
  const elapsedWeeks = Math.max(1, elapsedDaysInMonth / 7);
  const averageVisitsPerWeek =
    visitCount === 0
      ? 0
      : Math.round((visitCount / elapsedWeeks) * 100) / 100;

  const monthLabel = new Date(Date.UTC(year, monthIndex0, 1)).toLocaleString(
    "en-US",
    { month: "long", timeZone: "UTC" },
  );

  return {
    year,
    monthIndex0,
    monthLabel,
    visitDateKeys,
    visitCount,
    averageVisitsPerWeek,
  };
}
