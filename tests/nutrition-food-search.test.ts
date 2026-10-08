import { describe, expect, it } from "vitest";

import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import {
  NUTRITION_SEARCH_RESULT_LIMIT,
  nutritionCatalogSearchTokens,
  nutritionSearchQueryMeetsMinLength,
  NUTRITION_SEARCH_MIN_CHARS,
  isProcessedSweetPotatoFood,
  isSweetPotatoTuberSearch,
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

  it("matches partial token prefixes like swee and chic", () => {
    const sweetPotato = food({
      foodId: "usda:sp",
      name: "Sweet potato, baked, without salt",
      nameLower: "sweet potato, baked, without salt",
      canonicalKey: "potato:sweet:cooked",
      displayName: "Sweet Potato, Cooked",
      searchBoost: 90,
    });
    expect(passesNutritionSearchRelevanceGate("swee", sweetPotato)).toBe(true);
    expect(passesNutritionSearchRelevanceGate("sweet potato", sweetPotato)).toBe(
      true,
    );

    const chicken = food({
      foodId: "usda:ch",
      name: "Chicken, breast, roasted",
      nameLower: "chicken, breast, roasted",
      canonicalKey: "chicken:breast:cooked",
      displayName: "Chicken Breast, Cooked",
    });
    expect(passesNutritionSearchRelevanceGate("chic", chicken)).toBe(true);
  });

  it("requires at least 2 characters before search runs", () => {
    expect(NUTRITION_SEARCH_MIN_CHARS).toBe(2);
    expect(nutritionSearchQueryMeetsMinLength("c")).toBe(false);
    expect(nutritionSearchQueryMeetsMinLength("ch")).toBe(true);
  });

  it("filters 2-character ch to chicken-related foods", () => {
    const chicken = food({
      foodId: "usda:ch",
      name: "Chicken, breast, roasted",
      nameLower: "chicken, breast, roasted",
      canonicalKey: "chicken:breast:cooked",
      displayName: "Chicken Breast, Cooked",
    });
    const cheese = food({
      foodId: "usda:cheese",
      name: "Cheese, cheddar",
      nameLower: "cheese, cheddar",
      canonicalKey: "generic:cheese-cheddar",
      displayName: "Cheese",
    });
    expect(passesNutritionSearchRelevanceGate("ch", chicken)).toBe(true);
    expect(passesNutritionSearchRelevanceGate("ch", cheese)).toBe(false);
    const ranked = rankNutritionFoodSearchResults("ch", [cheese, chicken]);
    expect(ranked[0]?.canonicalKey).toMatch(/^chicken:/);
  });

  it("expands 2-character tokens for chicken prefix queries", () => {
    expect(nutritionCatalogSearchTokens("ch")).toContain("chicken");
    expect(nutritionCatalogSearchTokens("do")).toContain("dosa");
    expect(nutritionCatalogSearchTokens("id")).toContain("idli");
    expect(nutritionCatalogSearchTokens("sa")).toContain("sambar");
  });

  it("returns Idli for idli, idl, and id queries", () => {
    const idli = food({
      foodId: "indb:ASC144",
      source: "indb",
      name: "Idli",
      nameLower: "idli",
      canonicalKey: "indb:idli",
      displayName: "Idli",
      searchPrefixes: ["idl", "idli"],
    });
    for (const q of ["idli", "idl", "id"]) {
      expect(passesNutritionSearchRelevanceGate(q, idli)).toBe(true);
      const ranked = rankNutritionFoodSearchResults(q, [idli]);
      expect(ranked.some((r) => r.displayName === "Idli")).toBe(true);
    }
  });

  it("uses all query tokens for firestore candidate lookup", () => {
    expect(nutritionCatalogSearchTokens("sweet potato")).toEqual([
      "potato",
      "sweet",
    ]);
    expect(nutritionCatalogSearchTokens("chicken breast")).toContain("chicken");
    expect(nutritionCatalogSearchTokens("chicken breast")).toContain("breast");
  });

  it("ranks sweet potato highly for swee and sweet potato queries", () => {
    const sweetPotato = food({
      foodId: "usda:sp",
      name: "Sweet potato, baked, without salt",
      nameLower: "sweet potato, baked, without salt",
      canonicalKey: "potato:sweet:cooked",
      displayName: "Sweet Potato, Cooked",
      searchBoost: 90,
    });
    const noise = food({
      foodId: "usda:n",
      name: "Sweet rolls",
      nameLower: "sweet rolls",
      canonicalKey: "generic:sweet-rolls",
      displayName: "Sweet Rolls",
    });
    const swee = rankNutritionFoodSearchResults("swee", [noise, sweetPotato]);
    expect(swee[0]?.foodId).toBe("usda:sp");
    const phrase = rankNutritionFoodSearchResults("sweet potato", [
      noise,
      sweetPotato,
    ]);
    expect(phrase[0]?.displayName).toMatch(/Sweet Potato/i);
  });

  it("excludes sweet potato leaves and fried from tuber-style searches", () => {
    const leaves = food({
      foodId: "usda:leaves",
      name: "Sweet potato leaves, raw",
      nameLower: "sweet potato leaves, raw",
      canonicalKey: "potato:sweet:raw",
      displayName: "Sweet Potato",
    });
    expect(isSweetPotatoTuberSearch("swee")).toBe(true);
    expect(isSweetPotatoTuberSearch("sweet potato leaves")).toBe(false);
    expect(passesNutritionSearchRelevanceGate("swee", leaves)).toBe(false);
    expect(passesNutritionSearchRelevanceGate("sweet potato", leaves)).toBe(false);
    expect(
      passesNutritionSearchRelevanceGate("sweet potato leaves", leaves),
    ).toBe(true);

    const fried = food({
      foodId: "usda:168015",
      name: "Sweet Potatoes, french fried, crosscut, frozen, unprepared",
      nameLower:
        "sweet potatoes, french fried, crosscut, frozen, unprepared",
      canonicalKey: "potato:sweet:fried",
      displayName: "Sweet Potatoes",
    });
    expect(isProcessedSweetPotatoFood(fried)).toBe(true);
    expect(passesNutritionSearchRelevanceGate("swee", fried)).toBe(false);
    expect(passesNutritionSearchRelevanceGate("sweet potato", fried)).toBe(false);
  });

  it("ranks raw sweet potato above cooked for tuber searches", () => {
    const raw = food({
      foodId: "usda:raw",
      name: "Sweet potato, raw, unprepared",
      nameLower: "sweet potato, raw, unprepared",
      canonicalKey: "potato:sweet:raw",
      displayName: "Sweet Potato",
      searchBoost: 95,
    });
    const cooked = food({
      foodId: "usda:cooked",
      name: "Sweet potato, baked",
      nameLower: "sweet potato, baked",
      canonicalKey: "potato:sweet:cooked",
      displayName: "Sweet Potato, Cooked",
      searchBoost: 90,
    });
    const ranked = rankNutritionFoodSearchResults("sweet potato", [cooked, raw]);
    expect(ranked[0]?.canonicalKey).toBe("potato:sweet:raw");
    expect(ranked[1]?.canonicalKey).toBe("potato:sweet:cooked");
  });

  it("assigns distinct canonical keys for meaningful egg parts", () => {
    expect(computeNutritionCanonicalKey("Sweet potato leaves, raw")).toBe(
      "vegetable:sweet-potato-leaves",
    );
    expect(computeNutritionCanonicalKey("Egg, whole, raw")).toBe("egg:whole:raw");
    expect(computeNutritionCanonicalKey("Egg, white, raw")).toBe("egg:white:raw");
    expect(computeNutritionCanonicalKey("Egg, yolk, raw")).toBe("egg:yolk:raw");
    expect(computeNutritionCanonicalKey("Eggplant, raw")).toBe("vegetable:eggplant");
  });
});
