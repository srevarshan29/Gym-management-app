import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";
import type { NutritionServingPortion } from "@/lib/nutrition/nutrition-serving-portion";

export type NutritionQuantityMode = "count" | "grams";

export type NutritionQuantityFood = Pick<
  NutritionFoodSearchResult,
  "name" | "servingSizeGrams" | "servingSizeLabel"
>;

/** Effective per-count grams + unit label (from catalog enrichment or USDA portions). */
export function effectiveServingPortion(
  food: NutritionQuantityFood,
): NutritionServingPortion | null {
  if (
    food.servingSizeGrams != null &&
    food.servingSizeGrams > 0 &&
    food.servingSizeLabel?.trim()
  ) {
    return {
      grams: food.servingSizeGrams,
      label: food.servingSizeLabel.trim(),
    };
  }
  if (food.servingSizeGrams != null && food.servingSizeGrams > 0) {
    const eggLabel = servingLabelForEgg(food.name);
    if (eggLabel) {
      return { grams: food.servingSizeGrams, label: eggLabel };
    }
  }
  return null;
}

function servingLabelForEgg(name: string): string | null {
  const lower = name.toLowerCase();
  if (/\begg\b/.test(lower) && !/eggplant/.test(lower)) {
    return "egg";
  }
  return null;
}

export function resolveNutritionQuantityMode(
  food: NutritionQuantityFood,
): NutritionQuantityMode {
  const portion = effectiveServingPortion(food);
  if (portion) {
    return "count";
  }
  return "grams";
}

export function effectiveServingSizeGrams(
  food: NutritionQuantityFood,
): number | null {
  const portion = effectiveServingPortion(food);
  return portion?.grams ?? food.servingSizeGrams;
}
