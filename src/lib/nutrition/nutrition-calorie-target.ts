export const MEMBER_DAILY_CALORIE_TARGET_MIN = 800;
export const MEMBER_DAILY_CALORIE_TARGET_MAX = 10_000;

export type NutritionCalorieTargetSource = "member" | "gym" | null;

export type ResolvedNutritionCalorieTarget = {
  targetCalories: number | null;
  targetSource: NutritionCalorieTargetSource;
  memberDailyCalorieTarget: number | null;
  gymDailyCalorieTarget: number | null;
};

export function parseValidDailyCalorieTarget(
  value: unknown,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(numeric)) {
    return null;
  }
  const rounded = Math.round(numeric);
  if (
    rounded < MEMBER_DAILY_CALORIE_TARGET_MIN ||
    rounded > MEMBER_DAILY_CALORIE_TARGET_MAX
  ) {
    return null;
  }
  return rounded;
}

export function assertValidMemberDailyCalorieTarget(value: number): number {
  const parsed = parseValidDailyCalorieTarget(value);
  if (parsed == null) {
    throw new Error(
      `Daily calorie target must be between ${MEMBER_DAILY_CALORIE_TARGET_MIN} and ${MEMBER_DAILY_CALORIE_TARGET_MAX} kcal.`,
    );
  }
  return parsed;
}

/**
 * Active ring target: member custom → gym diet plan → none.
 * Gym and member values are stored independently (no silent overwrite).
 */
export function resolveNutritionCalorieTarget(input: {
  memberCustomDailyCalorieTarget: number | null | undefined;
  gymDietPlanCaloriesPerDay: number | null | undefined;
}): ResolvedNutritionCalorieTarget {
  const memberDailyCalorieTarget = parseValidDailyCalorieTarget(
    input.memberCustomDailyCalorieTarget,
  );
  const gymDailyCalorieTarget = parseValidDailyCalorieTarget(
    input.gymDietPlanCaloriesPerDay,
  );

  if (memberDailyCalorieTarget != null) {
    return {
      targetCalories: memberDailyCalorieTarget,
      targetSource: "member",
      memberDailyCalorieTarget,
      gymDailyCalorieTarget,
    };
  }

  if (gymDailyCalorieTarget != null) {
    return {
      targetCalories: gymDailyCalorieTarget,
      targetSource: "gym",
      memberDailyCalorieTarget: null,
      gymDailyCalorieTarget,
    };
  }

  return {
    targetCalories: null,
    targetSource: null,
    memberDailyCalorieTarget: null,
    gymDailyCalorieTarget: null,
  };
}

export function nutritionCalorieTargetSourceLabel(
  source: NutritionCalorieTargetSource,
): string | null {
  if (source === "member") return "Set by You";
  if (source === "gym") return "Set by Gym";
  return null;
}
