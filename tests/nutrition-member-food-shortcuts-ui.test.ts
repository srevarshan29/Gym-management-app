import { describe, expect, it } from "vitest";

import { applyFavoriteToggleToShortcuts } from "@/lib/nutrition/member-food-shortcuts-ui";
import type { NutritionFoodSearchResult } from "@/lib/nutrition/member-day";

function food(id: string, name: string): NutritionFoodSearchResult {
  return {
    foodId: id,
    name,
    category: null,
    caloriesPer100g: 100,
    proteinPer100g: 1,
    carbsPer100g: 1,
    fatPer100g: 1,
    fiberPer100g: 0,
    servingSizeGrams: null,
    servingSizeLabel: null,
  };
}

describe("applyFavoriteToggleToShortcuts", () => {
  it("adds food to favorites and removes from recent optimistically", () => {
    const chicken = food("usda:1", "Chicken");
    const result = applyFavoriteToggleToShortcuts(
      {
        favorites: [],
        recent: [chicken, food("usda:2", "Rice")],
      },
      chicken,
      true,
    );
    expect(result.favorites.map((f) => f.foodId)).toEqual(["usda:1"]);
    expect(result.recent.map((f) => f.foodId)).toEqual(["usda:2"]);
  });

  it("removes food from favorites when unfavorited", () => {
    const egg = food("usda:egg", "Egg");
    const result = applyFavoriteToggleToShortcuts(
      { favorites: [egg], recent: [] },
      egg,
      false,
    );
    expect(result.favorites).toHaveLength(0);
  });
});
