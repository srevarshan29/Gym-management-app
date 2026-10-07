import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";

export type NutritionMacroTotals = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
};

export type NutritionLogMacros = NutritionMacroTotals;

const GRAMS_MIN = 0.1;
const GRAMS_MAX = 10_000;

export function clampQuantityGrams(quantityGrams: number): number {
  if (!Number.isFinite(quantityGrams)) {
    throw new Error("Quantity must be a number.");
  }
  if (quantityGrams < GRAMS_MIN || quantityGrams > GRAMS_MAX) {
    throw new Error(`Quantity must be between ${GRAMS_MIN}g and ${GRAMS_MAX}g.`);
  }
  return Math.round(quantityGrams * 10) / 10;
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundCalories(value: number): number {
  return Math.round(value);
}

/** Server-side macro calculation from per-100g catalog values. */
export function calculateMacrosFromFood(
  food: Pick<
    NutritionFoodCatalogDoc,
    | "caloriesPer100g"
    | "proteinPer100g"
    | "carbsPer100g"
    | "fatPer100g"
    | "fiberPer100g"
  >,
  quantityGrams: number,
): NutritionLogMacros {
  const grams = clampQuantityGrams(quantityGrams);
  const factor = grams / 100;

  return {
    calories: roundCalories(food.caloriesPer100g * factor),
    proteinGrams: roundMacro(food.proteinPer100g * factor),
    carbsGrams: roundMacro(food.carbsPer100g * factor),
    fatGrams: roundMacro(food.fatPer100g * factor),
    fiberGrams: roundMacro(food.fiberPer100g * factor),
  };
}

export function sumMacroTotals(
  entries: NutritionMacroTotals[],
): NutritionMacroTotals {
  return entries.reduce(
    (acc, row) => ({
      calories: acc.calories + row.calories,
      proteinGrams: roundMacro(acc.proteinGrams + row.proteinGrams),
      carbsGrams: roundMacro(acc.carbsGrams + row.carbsGrams),
      fatGrams: roundMacro(acc.fatGrams + row.fatGrams),
      fiberGrams: roundMacro(acc.fiberGrams + row.fiberGrams),
    }),
    {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      fiberGrams: 0,
    },
  );
}
