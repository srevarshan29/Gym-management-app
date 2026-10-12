import type { SuggestedWorkoutDay } from "@/lib/workout-tracking/types";
import {
  type DashboardMessageCategory,
  type DashboardMessageEntry,
  DASHBOARD_MESSAGE_LIBRARY,
  messagesForCategory,
} from "@/lib/member-portal/dashboard-message-library";

export type DashboardMessageContext = {
  dateKey: string;
  memberId: string;
  memberName: string;
  suggestion: SuggestedWorkoutDay;
  workoutCompletedToday: boolean;
  caloriePercent: number | null;
  calorieGoalComplete: boolean;
  waterPercent: number;
  waterGoalComplete: boolean;
  waterRemainingMl: number;
  visitsThisWeek: number;
  daysSinceLastVisit: number | null;
  recentMessageKeys: string[];
  greetingDateKey: string | null;
  greetingMessageKey: string | null;
  celebratedCalorieDateKey: string | null;
  celebratedWaterDateKey: string | null;
};

export type ResolvedDashboardMessage = {
  text: string;
  messageKey: string;
  category: DashboardMessageCategory;
  showCalorieComplete: boolean;
  showWaterComplete: boolean;
  patchCelebratedCalorieDateKey: string | null;
  patchCelebratedWaterDateKey: string | null;
  patchGreetingDateKey: string | null;
  patchGreetingMessageKey: string | null;
  patchRecentMessageKeys: string[];
};

export function memberFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function stableIndex(seed: string, length: number): number {
  if (length <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % length;
}

function interpolate(
  template: string,
  vars: { name: string; waterRemaining: string },
): string {
  return template
    .replaceAll("{name}", vars.name)
    .replaceAll("{waterRemaining}", vars.waterRemaining);
}

function pickFromCategory(
  category: DashboardMessageCategory,
  ctx: DashboardMessageContext,
  slot: string,
  avoidKeys: Set<string>,
): DashboardMessageEntry {
  const pool = messagesForCategory(category);
  if (pool.length === 0) {
    return DASHBOARD_MESSAGE_LIBRARY[0]!;
  }

  const start = stableIndex(
    `${ctx.memberId}:${ctx.dateKey}:${category}:${slot}`,
    pool.length,
  );
  for (let offset = 0; offset < pool.length; offset++) {
    const entry = pool[(start + offset) % pool.length]!;
    if (!avoidKeys.has(entry.key)) return entry;
  }
  return pool[start]!;
}

function calorieCategory(ctx: DashboardMessageContext): DashboardMessageCategory {
  if (ctx.caloriePercent == null) return "calorie_behind";
  if (ctx.calorieGoalComplete) return "calorie_complete";
  if (ctx.caloriePercent >= 85) return "calorie_almost";
  if (ctx.caloriePercent >= 45) return "calorie_on_track";
  return "calorie_behind";
}

function waterCategory(ctx: DashboardMessageContext): DashboardMessageCategory {
  if (ctx.waterGoalComplete) return "water_complete";
  if (ctx.waterPercent >= 85) return "water_almost";
  if (ctx.waterPercent >= 45) return "water_on_track";
  return "water_behind";
}

function workoutCategory(
  ctx: DashboardMessageContext,
): DashboardMessageCategory {
  if (ctx.workoutCompletedToday) return "workout_completed";
  if (ctx.suggestion.kind === "resume") return "workout_in_progress";
  if (ctx.suggestion.kind === "suggested") return "workout_ready";
  if (ctx.suggestion.kind === "none" || ctx.suggestion.kind === "legacy") {
    return "workout_none";
  }
  return "workout_ready";
}

function shouldShowReturning(ctx: DashboardMessageContext): boolean {
  return ctx.daysSinceLastVisit != null && ctx.daysSinceLastVisit >= 5;
}

function shouldShowRest(ctx: DashboardMessageContext): boolean {
  return (
    !ctx.workoutCompletedToday &&
    (ctx.suggestion.kind === "none" || ctx.suggestion.kind === "legacy")
  );
}

function shouldShowAttendanceStrong(ctx: DashboardMessageContext): boolean {
  return ctx.visitsThisWeek >= 3;
}

export function resolveDashboardMessage(
  ctx: DashboardMessageContext,
  waterRemainingLabel: string,
): ResolvedDashboardMessage {
  const name = memberFirstName(ctx.memberName);
  const avoid = new Set(ctx.recentMessageKeys);

  const calorieCompleteFresh =
    ctx.calorieGoalComplete &&
    ctx.celebratedCalorieDateKey !== ctx.dateKey;
  const waterCompleteFresh =
    ctx.waterGoalComplete && ctx.celebratedWaterDateKey !== ctx.dateKey;
  const bothComplete =
    ctx.calorieGoalComplete &&
    ctx.waterGoalComplete &&
    ctx.caloriePercent != null;

  let category: DashboardMessageCategory = "greeting";
  let slot = "primary";

  if (bothComplete && (calorieCompleteFresh || waterCompleteFresh)) {
    category = "both_goals_complete";
    slot = "celebration";
  } else if (waterCompleteFresh && !calorieCompleteFresh) {
    category = "water_complete";
    slot = "celebration";
  } else if (calorieCompleteFresh && !waterCompleteFresh) {
    category = "calorie_complete";
    slot = "celebration";
  } else if (ctx.workoutCompletedToday) {
    category = "workout_completed";
    slot = "workout";
  } else if (shouldShowReturning(ctx)) {
    category = "returning";
    slot = "return";
  } else if (ctx.suggestion.kind === "resume") {
    category = "workout_in_progress";
    slot = "workout";
  } else if (ctx.suggestion.kind === "suggested") {
    category = "workout_ready";
    slot = "workout";
  } else if (shouldShowRest(ctx)) {
    category = "rest_recovery";
    slot = "rest";
  } else if (shouldShowAttendanceStrong(ctx)) {
    category = "attendance_strong";
    slot = "attendance";
  } else if (ctx.visitsThisWeek <= 1) {
    category = "attendance_building";
    slot = "attendance";
  } else if (ctx.caloriePercent != null && !ctx.calorieGoalComplete) {
    category = calorieCategory(ctx);
    slot = "nutrition";
  } else if (!ctx.waterGoalComplete) {
    category = waterCategory(ctx);
    slot = "water";
  } else if (
    ctx.greetingDateKey === ctx.dateKey &&
    ctx.greetingMessageKey
  ) {
    const pinned = DASHBOARD_MESSAGE_LIBRARY.find(
      (m) => m.key === ctx.greetingMessageKey,
    );
    if (pinned) {
      return finalize(ctx, pinned, name, waterRemainingLabel, {
        showCalorieComplete: calorieCompleteFresh,
        showWaterComplete: waterCompleteFresh,
      });
    }
  }

  if (category === "greeting") {
    if (ctx.greetingDateKey === ctx.dateKey && ctx.greetingMessageKey) {
      const pinned = DASHBOARD_MESSAGE_LIBRARY.find(
        (m) => m.key === ctx.greetingMessageKey,
      );
      if (pinned) {
        return finalize(ctx, pinned, name, waterRemainingLabel, {
          showCalorieComplete: calorieCompleteFresh,
          showWaterComplete: waterCompleteFresh,
        });
      }
    }
  }

  const entry = pickFromCategory(category, ctx, slot, avoid);
  return finalize(ctx, entry, name, waterRemainingLabel, {
    showCalorieComplete: calorieCompleteFresh,
    showWaterComplete: waterCompleteFresh,
    pinGreeting: category === "greeting",
  });
}

function finalize(
  ctx: DashboardMessageContext,
  entry: DashboardMessageEntry,
  name: string,
  waterRemainingLabel: string,
  options: {
    showCalorieComplete: boolean;
    showWaterComplete: boolean;
    pinGreeting?: boolean;
  },
): ResolvedDashboardMessage {
  const text = interpolate(entry.template, {
    name,
    waterRemaining: waterRemainingLabel,
  });

  const recent = [...ctx.recentMessageKeys, entry.key].slice(-24);

  let patchCelebratedCalorie = ctx.celebratedCalorieDateKey;
  let patchCelebratedWater = ctx.celebratedWaterDateKey;
  if (options.showCalorieComplete) {
    patchCelebratedCalorie = ctx.dateKey;
  }
  if (options.showWaterComplete) {
    patchCelebratedWater = ctx.dateKey;
  }

  return {
    text,
    messageKey: entry.key,
    category: entry.category,
    showCalorieComplete: options.showCalorieComplete,
    showWaterComplete: options.showWaterComplete,
    patchCelebratedCalorieDateKey: patchCelebratedCalorie,
    patchCelebratedWaterDateKey: patchCelebratedWater,
    patchGreetingDateKey:
      options.pinGreeting === true ? ctx.dateKey : ctx.greetingDateKey,
    patchGreetingMessageKey:
      options.pinGreeting === true ? entry.key : ctx.greetingMessageKey,
    patchRecentMessageKeys: recent,
  };
}
