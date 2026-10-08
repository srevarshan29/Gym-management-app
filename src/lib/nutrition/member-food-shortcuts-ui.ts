import type { NutritionAddFoodShortcuts } from "@/lib/nutrition/member-food-shortcut-operations";
import {
  NUTRITION_MAX_FAVORITE_FOODS,
} from "@/lib/nutrition/member-food-shortcuts";
import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";

/** Optimistic local update after favorite toggle (Favorites win over Recent). */
export function applyFavoriteToggleToShortcuts(
  shortcuts: NutritionAddFoodShortcuts,
  food: NutritionFoodSearchResult,
  isFavorite: boolean,
): NutritionAddFoodShortcuts {
  let favorites = [...shortcuts.favorites];
  let recent = [...shortcuts.recent];

  if (isFavorite) {
    recent = recent.filter((item) => item.foodId !== food.foodId);
    favorites = [
      food,
      ...favorites.filter((item) => item.foodId !== food.foodId),
    ].slice(0, NUTRITION_MAX_FAVORITE_FOODS);
  } else {
    favorites = favorites.filter((item) => item.foodId !== food.foodId);
  }

  return { favorites, recent };
}
