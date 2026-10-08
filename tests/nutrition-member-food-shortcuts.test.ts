import { describe, expect, it } from "vitest";

import {
  recentFoodIdsExcludingFavorites,
  NUTRITION_MAX_FAVORITE_FOODS,
  NUTRITION_MAX_RECENT_FOODS,
  selectFavoriteFoodIds,
  selectRecentFoodIds,
  type MemberFoodShortcutRow,
} from "@/lib/nutrition/member-food-shortcuts";
import { rankNutritionFoodSearchResults } from "@/lib/nutrition/food-search";

function row(
  foodId: string,
  partial: Partial<MemberFoodShortcutRow> = {},
): MemberFoodShortcutRow {
  return {
    foodId,
    lastLoggedAtMs: null,
    isFavorite: false,
    favoritedAtMs: null,
    ...partial,
  };
}

describe("member nutrition food shortcuts", () => {
  it("returns unique recent foods ordered newest first", () => {
    const ids = selectRecentFoodIds([
      row("a", { lastLoggedAtMs: 100 }),
      row("b", { lastLoggedAtMs: 300 }),
      row("a", { lastLoggedAtMs: 200 }),
      row("c", { lastLoggedAtMs: 250 }),
    ]);
    expect(ids).toEqual(["b", "c", "a"]);
  });

  it("caps recent foods at 6", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row(`food-${i}`, { lastLoggedAtMs: i + 1 }),
    );
    const ids = selectRecentFoodIds(rows, NUTRITION_MAX_RECENT_FOODS);
    expect(ids).toHaveLength(6);
    expect(ids[0]).toBe("food-9");
  });

  it("caps favorites at 6 and orders by favoritedAt", () => {
    const ids = selectFavoriteFoodIds([
      row("a", { isFavorite: true, favoritedAtMs: 50 }),
      row("b", { isFavorite: true, favoritedAtMs: 200 }),
      row("c", { isFavorite: true, favoritedAtMs: 150 }),
      row("d", { isFavorite: false }),
      row("e", { isFavorite: true, favoritedAtMs: 10 }),
      row("f", { isFavorite: true, favoritedAtMs: 300 }),
      row("g", { isFavorite: true, favoritedAtMs: 250 }),
      row("h", { isFavorite: true, favoritedAtMs: 240 }),
      row("i", { isFavorite: true, favoritedAtMs: 230 }),
      row("j", { isFavorite: true, favoritedAtMs: 220 }),
    ]);
    expect(ids).toHaveLength(NUTRITION_MAX_FAVORITE_FOODS);
    expect(ids[0]).toBe("f");
    expect(ids).toEqual(["f", "g", "h", "i", "j", "b"]);
  });

  it("excludes favorites from recent (no overlap)", () => {
    const recent = recentFoodIdsExcludingFavorites(
      ["a", "b", "c", "d"],
      ["b", "c"],
    );
    expect(recent).toEqual(["a", "d"]);
  });
});

describe("nutrition search behavior unchanged", () => {
  it("still caps ranked search at 8 results", () => {
    const candidates = Array.from({ length: 12 }, (_, i) => ({
      foodId: `usda:${i}`,
      name: `Chicken sample ${i}`,
      nameLower: `chicken sample ${i}`,
      canonicalKey: `chicken:breast:cooked:${i}`,
      displayName: `Chicken ${i}`,
    }));
    expect(rankNutritionFoodSearchResults("chicken", candidates)).toHaveLength(8);
  });
});
