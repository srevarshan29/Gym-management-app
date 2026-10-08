import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";
import {
  calculateMacrosFromFood,
  type NutritionLogMacros,
} from "@/lib/nutrition/calculations";
import {
  effectiveServingPortion,
  effectiveServingSizeGrams,
  resolveNutritionQuantityMode,
  type NutritionQuantityMode,
} from "@/lib/nutrition/nutrition-quantity-mode";

export type { NutritionQuantityMode };

export function servingLabelForFood(
  food: Pick<
    NutritionFoodSearchResult,
    "name" | "servingSizeGrams" | "servingSizeLabel"
  >,
): string | null {
  const portion = effectiveServingPortion(food);
  if (portion) {
    return portion.label;
  }
  return null;
}

export function resolveQuantityMode(
  food: Pick<
    NutritionFoodSearchResult,
    "name" | "servingSizeGrams" | "servingSizeLabel"
  >,
): NutritionQuantityMode {
  return resolveNutritionQuantityMode(food);
}

export function gramsFromQuantityInput(
  mode: NutritionQuantityMode,
  amount: number,
  servingSizeGrams: number | null,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (mode === "count") {
    if (servingSizeGrams == null || servingSizeGrams <= 0) return 0;
    return Math.round(amount * servingSizeGrams * 10) / 10;
  }
  return Math.round(amount * 10) / 10;
}

export function defaultQuantityAmount(
  mode: NutritionQuantityMode,
  food: NutritionFoodSearchResult,
): number {
  if (mode === "count") return 1;
  const grams = effectiveServingSizeGrams(food);
  if (grams != null && grams > 0) {
    return grams;
  }
  return 100;
}

export function quantityAmountFromGrams(
  mode: NutritionQuantityMode,
  quantityGrams: number,
  servingSizeGrams: number | null,
): number {
  if (mode === "count" && servingSizeGrams != null && servingSizeGrams > 0) {
    return Math.round((quantityGrams / servingSizeGrams) * 10) / 10;
  }
  return quantityGrams;
}

export function formatQuantityLabel(
  mode: NutritionQuantityMode,
  amount: number,
  servingSizeLabel: string | null,
  quantityGrams: number,
): string {
  if (mode === "count" && servingSizeLabel) {
    const displayCount =
      Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
    return `${displayCount} ${servingSizeLabel}`;
  }
  const grams = quantityGrams > 0 ? quantityGrams : amount;
  return `${grams % 1 === 0 ? grams : grams.toFixed(1)} g`;
}

export function formatLogQuantity(
  quantityGrams: number,
  food?: Pick<
    NutritionFoodSearchResult,
    "name" | "servingSizeGrams" | "servingSizeLabel"
  > | null,
): string {
  if (food) {
    const mode = resolveQuantityMode(food);
    const servingGrams = effectiveServingSizeGrams(food);
    const label = servingLabelForFood(food);
    if (mode === "count" && servingGrams != null && label) {
      const amount = quantityAmountFromGrams(mode, quantityGrams, servingGrams);
      return formatQuantityLabel(mode, amount, label, quantityGrams);
    }
  }
  return `${quantityGrams % 1 === 0 ? quantityGrams : quantityGrams.toFixed(1)} g`;
}

export function previewMacrosFromFood(
  food: NutritionFoodSearchResult,
  quantityGrams: number,
): NutritionLogMacros | null {
  if (quantityGrams <= 0) return null;
  try {
    return calculateMacrosFromFood(food, quantityGrams);
  } catch {
    return null;
  }
}
