import { describe, expect, it } from "vitest";

import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import {
  NUTRITION_SEARCH_RESULT_LIMIT,
  passesNutritionSearchRelevanceGate,
  rankNutritionFoodSearchResults,
  scoreNutritionFoodSearch,
} from "@/lib/nutrition/food-search";
import { computeNutritionCanonicalKey } from "@/lib/nutrition/nutrition-canonical";

function food(
  partial: Partial<NutritionFoodCatalogDoc> & {
    foodId: string;
    name: string;
    nameLower: string;
  },
): NutritionFoodCatalogDoc {
  return {
    source: "USDA",
    sourceFoodId: partial.foodId.replace("usda:", ""),
    category: null,
    caloriesPer100g: 100,
    proteinPer100g: 10,
    carbsPer100g: 10,
    fatPer100g: 5,
    fiberPer100g: 1,
    servingSizeGrams: null,
    servingSizeLabel: null,
    aliases: [],
    searchPrefixes: [],
    sourceAttribution: {
      dataset: "test",
      version: null,
      url: "https://example.com",
      license: "test",
    },
    isActive: true,
    createdAt: {} as NutritionFoodCatalogDoc["createdAt"],
    updatedAt: {} as NutritionFoodCatalogDoc["updatedAt"],
    ...partial,
  };
}

describe("nutrition food search ranking", () => {
  it("returns at most 8 results", () => {
    const keys = [
      "egg:whole:raw",
      "egg:white:raw",
      "egg:yolk:raw",
      "egg:whole:cooked",
      "egg:white:cooked",
      "egg:yolk:cooked",
    ] as const;
    const candidates = Array.from({ length: 20 }, (_, i) => {
      const canonicalKey = keys[i % keys.length]!;
      return food({
        foodId: `usda:${i}`,
        name: `Egg sample ${i}`,
        nameLower: `egg sample ${i}`,
        canonicalKey,
        displayName: `Egg sample ${i}`,
      });
    });

    const results = rankNutritionFoodSearchResults("egg", candidates);
    expect(results.length).toBeLessThanOrEqual(NUTRITION_SEARCH_RESULT_LIMIT);
    expect(results.length).toBe(6);
  });

  it("filters unrelated prefix matches for query egg", () => {
    const bread = food({
      foodId: "usda:bread",
      name: "Bread, egg-enriched",
      nameLower: "bread, egg-enriched",
      canonicalKey: "generic:bread-egg-enriched",
      displayName: "Bread",
    });
    expect(passesNutritionSearchRelevanceGate("egg", bread)).toBe(false);
  });

  it("ranks common egg choices above eggplant for query egg", () => {
    const candidates = [
      food({
        foodId: "usda:eggplant",
        name: "Eggplant, raw",
        nameLower: "eggplant, raw",
        canonicalKey: "vegetable:eggplant",
        displayName: "Eggplant",
      }),
      food({
        foodId: "usda:whole",
        name: "Egg, whole, raw, fresh",
        nameLower: "egg, whole, raw, fresh",
        canonicalKey: "egg:whole:raw",
        displayName: "Whole Egg",
        searchBoost: 100,
      }),
      food({
        foodId: "usda:white",
        name: "Egg, white, raw",
        nameLower: "egg, white, raw",
        canonicalKey: "egg:white:raw",
        displayName: "Egg White",
        searchBoost: 95,
      }),
      food({
        foodId: "usda:yolk",
        name: "Egg, yolk, raw",
        nameLower: "egg, yolk, raw",
        canonicalKey: "egg:yolk:raw",
        displayName: "Egg Yolk",
        searchBoost: 90,
      }),
      food({
        foodId: "usda:boiled",
        name: "Egg, whole, hard-boiled",
        nameLower: "egg, whole, hard-boiled",
        canonicalKey: "egg:whole:cooked",
        displayName: "Boiled Egg",
        searchBoost: 88,
      }),
    ];

    const results = rankNutritionFoodSearchResults("egg", candidates);
    const names = results.map((r) => r.displayName ?? r.name);
    expect(names).not.toContain("Eggplant");
    expect(names[0]).toBe("Whole Egg");
    expect(names).toEqual(
      expect.arrayContaining(["Egg White", "Egg Yolk", "Boiled Egg"]),
    );
    expect(scoreNutritionFoodSearch("egg", candidates[0]!)).toBeLessThan(
      scoreNutritionFoodSearch("egg", candidates[1]!),
    );
  });

  it("prefers cooked white rice for query rice", () => {
    const candidates = [
      food({
        foodId: "usda:rice-wine",
        name: "Rice wine",
        nameLower: "rice wine",
        canonicalKey: "generic:rice-wine",
        displayName: "Rice Wine",
      }),
      food({
        foodId: "usda:rice-cooked",
        name: "Rice, white, cooked",
        nameLower: "rice, white, cooked",
        canonicalKey: "rice:white:cooked",
        displayName: "White Rice, Cooked",
        searchBoost: 100,
      }),
      food({
        foodId: "usda:rice-raw",
        name: "Rice, white, raw",
        nameLower: "rice, white, raw",
        canonicalKey: "rice:white:raw",
        displayName: "White Rice, Raw",
        searchBoost: 75,
      }),
    ];

    const results = rankNutritionFoodSearchResults("rice", candidates);
    expect(results[0]?.displayName).toBe("White Rice, Cooked");
  });

  it("dedupes by canonical key in search results", () => {
    const candidates = [
      food({
        foodId: "usda:1",
        name: "Egg, whole, raw, frozen",
        nameLower: "egg, whole, raw, frozen",
        canonicalKey: "egg:whole:raw",
        displayName: "Whole Egg",
      }),
      food({
        foodId: "usda:2",
        name: "Egg, whole, raw, fresh",
        nameLower: "egg, whole, raw, fresh",
        canonicalKey: "egg:whole:raw",
        displayName: "Whole Egg",
        searchBoost: 100,
      }),
    ];

    const results = rankNutritionFoodSearchResults("egg", candidates);
    expect(results).toHaveLength(1);
  });

  it("surfaces chicken breast and banana for short queries", () => {
    const candidates = [
      food({
        foodId: "usda:chicken-soup",
        name: "Chicken broth, canned",
        nameLower: "chicken broth, canned",
        canonicalKey: "generic:chicken-broth-canned",
        displayName: "Chicken Broth",
      }),
      food({
        foodId: "usda:chicken-breast",
        name: "Chicken, breast, meat only, cooked, roasted",
        nameLower: "chicken, breast, meat only, cooked, roasted",
        canonicalKey: "chicken:breast:cooked",
        displayName: "Chicken Breast, Cooked",
        searchBoost: 98,
      }),
      food({
        foodId: "usda:banana-chip",
        name: "Banana chips",
        nameLower: "banana chips",
        canonicalKey: "generic:banana-chips",
        displayName: "Banana Chips",
      }),
      food({
        foodId: "usda:banana",
        name: "Bananas, raw",
        nameLower: "bananas, raw",
        canonicalKey: "banana:raw",
        displayName: "Banana",
        searchBoost: 100,
      }),
    ];

    const chicken = rankNutritionFoodSearchResults("chicken", candidates);
    expect(chicken[0]?.displayName).toBe("Chicken Breast, Cooked");

    const banana = rankNutritionFoodSearchResults("banana", candidates);
    expect(banana[0]?.displayName).toBe("Banana");
  });

  it("assigns distinct canonical keys for meaningful egg parts", () => {
    expect(computeNutritionCanonicalKey("Egg, whole, raw")).toBe("egg:whole:raw");
    expect(computeNutritionCanonicalKey("Egg, white, raw")).toBe("egg:white:raw");
    expect(computeNutritionCanonicalKey("Egg, yolk, raw")).toBe("egg:yolk:raw");
    expect(computeNutritionCanonicalKey("Eggplant, raw")).toBe("vegetable:eggplant");
  });
});
