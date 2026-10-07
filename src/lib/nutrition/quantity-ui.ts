import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";
import {
  calculateMacrosFromFood,
  type NutritionLogMacros,
} from "@/lib/nutrition/calculations";

export type NutritionQuantityMode = "count" | "grams";

/** Catalog label, or a safe UI-only label when USDA portions lack text. */
export function servingLabelForFood(
  food: Pick<NutritionFoodSearchResult, "name" | "servingSizeLabel">,
): string | null {
  if (food.servingSizeLabel?.trim()) {
    return food.servingSizeLabel.trim();
  }
  const name = food.name.toLowerCase();
  if (/\begg\b/.test(name) && !/eggplant/.test(name)) {
    return "egg";
  }
  return null;
}

export function resolveQuantityMode(
  food: Pick<
    NutritionFoodSearchResult,
    "name" | "servingSizeGrams" | "servingSizeLabel"
  >,
): NutritionQuantityMode {
  if (food.servingSizeGrams == null || food.servingSizeGrams <= 0) {
    return "grams";
  }
  if (food.servingSizeLabel?.trim()) {
    return "count";
  }
  if (servingLabelForFood(food)) {
    return "count";
  }
  return "grams";
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
  if (food.servingSizeGrams != null && food.servingSizeGrams > 0) {
    return food.servingSizeGrams;
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
    return `${displayCount} × ${servingSizeLabel}`;
  }
  const grams = quantityGrams > 0 ? quantityGrams : amount;
  return `${grams % 1 === 0 ? grams : grams.toFixed(1)} g`;
}

export function formatLogQuantity(quantityGrams: number): string {
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
