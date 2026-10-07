import { describe, expect, it } from "vitest";

import {
  calculateMacrosFromFood,
  clampQuantityGrams,
  sumMacroTotals,
} from "@/lib/nutrition/calculations";

const sampleFood = {
  caloriesPer100g: 200,
  proteinPer100g: 10,
  carbsPer100g: 20,
  fatPer100g: 8,
  fiberPer100g: 3,
};

describe("nutrition calculations", () => {
  it("scales macros from per-100g values", () => {
    const macros = calculateMacrosFromFood(sampleFood, 50);
    expect(macros).toEqual({
      calories: 100,
      proteinGrams: 5,
      carbsGrams: 10,
      fatGrams: 4,
      fiberGrams: 1.5,
    });
  });

  it("rejects invalid quantities", () => {
    expect(() => clampQuantityGrams(0)).toThrow();
    expect(() => clampQuantityGrams(20_000)).toThrow();
  });

  it("sums macro totals", () => {
    const total = sumMacroTotals([
      {
        calories: 100,
        proteinGrams: 5,
        carbsGrams: 10,
        fatGrams: 4,
        fiberGrams: 1,
      },
      {
        calories: 50,
        proteinGrams: 2.5,
        carbsGrams: 5,
        fatGrams: 2,
        fiberGrams: 0.5,
      },
    ]);
    expect(total.calories).toBe(150);
    expect(total.proteinGrams).toBe(7.5);
    expect(total.carbsGrams).toBe(15);
    expect(total.fatGrams).toBe(6);
    expect(total.fiberGrams).toBe(1.5);
  });
});
