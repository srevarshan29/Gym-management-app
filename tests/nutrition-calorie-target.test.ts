import { describe, expect, it } from "vitest";

import {
  MEMBER_DAILY_CALORIE_TARGET_MAX,
  MEMBER_DAILY_CALORIE_TARGET_MIN,
  nutritionCalorieTargetSourceLabel,
  parseValidDailyCalorieTarget,
  resolveNutritionCalorieTarget,
} from "@/lib/nutrition/nutrition-calorie-target";

describe("nutrition calorie target", () => {
  it("prefers member custom target over gym diet plan", () => {
    const resolved = resolveNutritionCalorieTarget({
      memberCustomDailyCalorieTarget: 1800,
      gymDietPlanCaloriesPerDay: 2200,
    });
    expect(resolved.targetCalories).toBe(1800);
    expect(resolved.targetSource).toBe("member");
    expect(resolved.gymDailyCalorieTarget).toBe(2200);
    expect(resolved.memberDailyCalorieTarget).toBe(1800);
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

  it("keeps gym and member values independent when member overrides", () => {
    const resolved = resolveNutritionCalorieTarget({
      memberCustomDailyCalorieTarget: 2500,
      gymDietPlanCaloriesPerDay: 2000,
    });
    expect(resolved.gymDailyCalorieTarget).toBe(2000);
    expect(resolved.targetCalories).toBe(2500);
    expect(nutritionCalorieTargetSourceLabel("member")).toBe("Set by You");
  });
});
