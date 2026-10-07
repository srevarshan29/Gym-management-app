import type { NutritionMealType } from "@/lib/firestore/types";

export const NUTRITION_MEAL_TYPES: NutritionMealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export const NUTRITION_MEAL_LABELS: Record<NutritionMealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

export function isNutritionMealType(value: string): value is NutritionMealType {
  return (NUTRITION_MEAL_TYPES as string[]).includes(value);
}
