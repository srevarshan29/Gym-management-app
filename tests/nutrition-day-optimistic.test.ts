import { describe, expect, it } from "vitest";

import { removeNutritionLogEntryOptimistic } from "@/lib/nutrition/member-day-optimistic";
import type { MemberNutritionDayView } from "@/lib/nutrition/member-day";

const baseDay: MemberNutritionDayView = {
  logDate: "2026-10-07",
  targetCalories: 2000,
  totals: {
    calories: 300,
    proteinGrams: 20,
    carbsGrams: 30,
    fatGrams: 10,
    fiberGrams: 2,
  },
  meals: {
    breakfast: [
      {
        id: "log-1",
        mealType: "breakfast",
        foodId: "usda:1",
        foodName: "Egg",
        quantityGrams: 100,
        calories: 150,
        proteinGrams: 12,
        carbsGrams: 1,
        fatGrams: 10,
        fiberGrams: 0,
      },
    ],
    lunch: [
      {
        id: "log-2",
        mealType: "lunch",
        foodId: "usda:2",
        foodName: "Rice",
        quantityGrams: 150,
        calories: 150,
        proteinGrams: 8,
        carbsGrams: 29,
        fatGrams: 0,
        fiberGrams: 2,
      },
    ],
    dinner: [],
    snack: [],
  },
  entries: [],
};

baseDay.entries = [
  ...baseDay.meals.breakfast,
  ...baseDay.meals.lunch,
];

describe("removeNutritionLogEntryOptimistic", () => {
  it("removes entry and updates totals immediately", () => {
    const next = removeNutritionLogEntryOptimistic(baseDay, "log-1");
    expect(next.entries).toHaveLength(1);
    expect(next.entries[0]?.id).toBe("log-2");
    expect(next.totals.calories).toBe(150);
    expect(next.meals.breakfast).toHaveLength(0);
  });
});
