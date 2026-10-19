import { describe, expect, it } from "vitest";

import {
  MEMBER_DAILY_CALORIE_TARGET_MAX,
  MEMBER_DAILY_CALORIE_TARGET_MIN,
  nutritionCalorieTargetSourceLabel,
  parseValidDailyCalorieTarget,
  resolveNutritionCalorieTarget,
} from "@/lib/nutrition/nutrition-calorie-target";

describe("nutrition calorie target", () => {
  it("prefers gym diet plan over member custom target", () => {
    const resolved = resolveNutritionCalorieTarget({
      memberCustomDailyCalorieTarget: 2600,
      gymDietPlanCaloriesPerDay: 2800,
    });
    expect(resolved.targetCalories).toBe(2800);
    expect(resolved.targetSource).toBe("gym");
    expect(resolved.gymDailyCalorieTarget).toBe(2800);
    expect(resolved.memberDailyCalorieTarget).toBe(2600);
  });

  it("uses gym target when member has no custom target", () => {
    const resolved = resolveNutritionCalorieTarget({
      memberCustomDailyCalorieTarget: null,
      gymDietPlanCaloriesPerDay: 2100,
    });
    expect(resolved.targetCalories).toBe(2100);
    expect(resolved.targetSource).toBe("gym");
    expect(nutritionCalorieTargetSourceLabel(resolved.targetSource)).toBe(
      "Set by Gym",
    );
  });

  it("returns no target when neither is set", () => {
    const resolved = resolveNutritionCalorieTarget({
      memberCustomDailyCalorieTarget: null,
      gymDietPlanCaloriesPerDay: null,
    });
    expect(resolved.targetCalories).toBeNull();
    expect(resolved.targetSource).toBeNull();
  });

  it("rejects out-of-range member targets without coercing", () => {
    expect(parseValidDailyCalorieTarget(500)).toBeNull();
    expect(parseValidDailyCalorieTarget(20_000)).toBeNull();
    expect(parseValidDailyCalorieTarget(MEMBER_DAILY_CALORIE_TARGET_MIN)).toBe(
      MEMBER_DAILY_CALORIE_TARGET_MIN,
    );
    expect(parseValidDailyCalorieTarget(MEMBER_DAILY_CALORIE_TARGET_MAX)).toBe(
      MEMBER_DAILY_CALORIE_TARGET_MAX,
    );
  });

  it("keeps stored member value when gym plan is authoritative", () => {
    const resolved = resolveNutritionCalorieTarget({
      memberCustomDailyCalorieTarget: 2500,
      gymDietPlanCaloriesPerDay: 2000,
    });
    expect(resolved.gymDailyCalorieTarget).toBe(2000);
    expect(resolved.targetCalories).toBe(2000);
    expect(resolved.memberDailyCalorieTarget).toBe(2500);
    expect(nutritionCalorieTargetSourceLabel("gym")).toBe("Set by Gym");
  });
});
