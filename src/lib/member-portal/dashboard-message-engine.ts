import { formatWaterRemainingMl } from "@/lib/water/water-progress";
import type { SuggestedWorkoutDay } from "@/lib/workout-tracking/types";

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
  recentMessageKeys: string[];
  greetingDateKey: string | null;
  greetingMessageKey: string | null;
  celebratedCalorieDateKey: string | null;
  celebratedWaterDateKey: string | null;
};

export type ResolvedDashboardMessage = {
  text: string;
  messageKey: string;
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

function stablePick(seed: string, options: string[]): string {
  if (options.length === 0) return "Ready when you are.";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return options[hash % options.length]!;
}

export function resolveDashboardMessage(
  ctx: DashboardMessageContext,
): ResolvedDashboardMessage {
  const waterRemainingLabel = formatWaterRemainingMl(ctx.waterRemainingMl);
  const seed = `${ctx.memberId}:${ctx.dateKey}:primary`;

  const calorieCompleteFresh =
    ctx.calorieGoalComplete &&
    ctx.celebratedCalorieDateKey !== ctx.dateKey;
  const waterCompleteFresh =
    ctx.waterGoalComplete && ctx.celebratedWaterDateKey !== ctx.dateKey;

  let text: string;
  let messageKey: string;

  if (ctx.workoutCompletedToday) {
    text = stablePick(seed, [
      "Workout completed today. Great job!",
      "You finished today's training — well done!",
      "Today's workout is done. Nice work!",
    ]);
    messageKey = `priority:workout_completed:${text}`;
  } else if (ctx.calorieGoalComplete && ctx.waterGoalComplete) {
    text = stablePick(seed, [
      "Daily calorie and water goals reached — stellar day!",
      "Food and hydration targets met for today.",
    ]);
    messageKey = `priority:both_goals:${text}`;
  } else if (ctx.calorieGoalComplete) {
    text = stablePick(seed, [
      "Daily calorie goal reached — well fueled.",
      "Calorie target met for today.",
    ]);
    messageKey = `priority:calorie_goal:${text}`;
  } else if (ctx.waterGoalComplete) {
    text = stablePick(seed, [
      "Water goal reached for today.",
      "Hydration target met — keep it steady.",
    ]);
    messageKey = `priority:water_goal:${text}`;
  } else if (ctx.suggestion.kind === "resume") {
    text = stablePick(seed, [
      "Workout in progress — resume when you're ready.",
      "You have a session to finish. Pick up where you left off.",
    ]);
    messageKey = `priority:in_progress:${text}`;
  } else if (!ctx.waterGoalComplete) {
    text = `Keep hydrating. ${waterRemainingLabel}.`;
    messageKey = `priority:hydrate:${waterRemainingLabel}`;
  } else {
    text = "Ready when you are.";
    messageKey = `priority:default:${ctx.dateKey}`;
  }

  const recent =
    ctx.recentMessageKeys.at(-1) === messageKey
      ? ctx.recentMessageKeys
      : [...ctx.recentMessageKeys, messageKey].slice(-24);

  let patchCelebratedCalorie = ctx.celebratedCalorieDateKey;
  let patchCelebratedWater = ctx.celebratedWaterDateKey;
  let showCalorieComplete = false;
  let showWaterComplete = false;

  if (calorieCompleteFresh && ctx.workoutCompletedToday) {
    showCalorieComplete = true;
    patchCelebratedCalorie = ctx.dateKey;
  } else if (calorieCompleteFresh && !ctx.workoutCompletedToday) {
    showCalorieComplete = true;
    patchCelebratedCalorie = ctx.dateKey;
  }

  if (waterCompleteFresh) {
    showWaterComplete = true;
    patchCelebratedWater = ctx.dateKey;
  }

  return {
    text,
    messageKey,
    showCalorieComplete,
    showWaterComplete,
    patchCelebratedCalorieDateKey: patchCelebratedCalorie,
    patchCelebratedWaterDateKey: patchCelebratedWater,
    patchGreetingDateKey: ctx.greetingDateKey,
    patchGreetingMessageKey: ctx.greetingMessageKey,
    patchRecentMessageKeys: recent,
  };
}
