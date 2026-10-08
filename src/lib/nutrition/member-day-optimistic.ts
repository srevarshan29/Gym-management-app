import { NUTRITION_MEAL_TYPES } from "@/lib/nutrition/meal-types";
import type { MemberNutritionDayView } from "@/lib/nutrition/member-day";
import { sumMacroTotals } from "@/lib/nutrition/calculations";

/** Remove a log entry locally and recompute meal buckets + totals. */
export function removeNutritionLogEntryOptimistic(
  day: MemberNutritionDayView,
  logId: string,
): MemberNutritionDayView {
  const entries = day.entries.filter((entry) => entry.id !== logId);
  const meals = NUTRITION_MEAL_TYPES.reduce(
    (acc, mealType) => {
      acc[mealType] = entries.filter((entry) => entry.mealType === mealType);
      return acc;
    },
    {} as MemberNutritionDayView["meals"],
  );

  return {
    logDate: day.logDate,
    targetCalories: day.targetCalories,
    targetSource: day.targetSource,
    memberDailyCalorieTarget: day.memberDailyCalorieTarget,
    gymDailyCalorieTarget: day.gymDailyCalorieTarget,
    totals: sumMacroTotals(entries),
    meals,
    entries,
  };
}
