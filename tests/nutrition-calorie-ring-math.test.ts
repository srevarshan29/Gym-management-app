import { describe, expect, it } from "vitest";

import { nutritionCalorieRingProgress } from "@/lib/nutrition/nutrition-calorie-ring-math";

describe("nutritionCalorieRingProgress", () => {
  it("returns no target and zero percent when target is null", () => {
    const result = nutritionCalorieRingProgress(420, null);
    expect(result.displayCalories).toBe(420);
    expect(result.displayTarget).toBeNull();
    expect(result.percent).toBe(0);
  });

  it("caps progress at 100% when over target", () => {
    const result = nutritionCalorieRingProgress(2500, 2000);
    expect(result.percent).toBe(100);
  });

  it("computes partial progress with a positive target", () => {
    const result = nutritionCalorieRingProgress(500, 2000);
    expect(result.displayTarget).toBe(2000);
    expect(result.percent).toBe(25);
  });

  it("treats invalid targets as missing", () => {
    expect(nutritionCalorieRingProgress(100, 0).displayTarget).toBeNull();
    expect(nutritionCalorieRingProgress(100, -10).displayTarget).toBeNull();
    expect(nutritionCalorieRingProgress(NaN, 2000).displayCalories).toBe(0);
  });
});
