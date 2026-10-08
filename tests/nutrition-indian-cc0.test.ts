import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import {
  indianCc0FoodId,
  loadIndianCc0FoodsFromJson,
  parseIndianCc0Row,
  resolveIndianCc0ImportCandidates,
} from "@/lib/nutrition/indian-cc0-catalog";
import { INDIAN_CC0_IMPORT_TARGETS } from "@/lib/nutrition/indian-cc0-priority";
import {
  NUTRITION_SEARCH_RESULT_LIMIT,
  passesNutritionSearchRelevanceGate,
  rankNutritionFoodSearchResults,
  scoreIndianCc0FoodSearch,
} from "@/lib/nutrition/food-search";
import { nutritionDisplayNameFromDoc } from "@/lib/nutrition/nutrition-canonical";

function loadFixtureFoods() {
  const filePath = resolve(
    process.cwd(),
    "data/indian-nutrition-data/foods.json",
  );
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  return loadIndianCc0FoodsFromJson(raw);
}

function indianFood(
  partial: Partial<NutritionFoodCatalogDoc> & {
    foodId: string;
    name: string;
    nameLower: string;
    canonicalKey: string;
    displayName: string;
  },
): NutritionFoodCatalogDoc {
  return {
    source: "indian_cc0",
    sourceFoodId: partial.foodId.replace("indian_cc0:", ""),
    category: "Test",
    caloriesPer100g: 100,
    proteinPer100g: 5,
    carbsPer100g: 10,
    fatPer100g: 3,
    fiberPer100g: 1,
    servingSizeGrams: null,
    servingSizeLabel: null,
    aliases: [],
    searchPrefixes: [],
    sourceAttribution: {
      dataset: "test",
      version: null,
      url: "https://example.com",
      license: "CC0",
    },
    isActive: true,
    createdAt: {} as NutritionFoodCatalogDoc["createdAt"],
    updatedAt: {} as NutritionFoodCatalogDoc["updatedAt"],
    searchBoost: 90,
    ...partial,
  };
}

describe("Indian CC0 catalog import", () => {
  it("parses paneer with indian_cc0 foodId and macros from dataset", () => {
    const foods = loadFixtureFoods();
    const paneer = foods.find((f) => f.name === "Paneer");
    expect(paneer).toBeDefined();
    const target = INDIAN_CC0_IMPORT_TARGETS.find((t) => t.datasetName === "Paneer")!;
    const parsed = parseIndianCc0Row(paneer!, target);
    expect(parsed).not.toBeNull();
    expect(parsed!.foodId).toBe(indianCc0FoodId(paneer!.id));
    expect(parsed!.caloriesPer100g).toBe(258);
    expect(parsed!.displayName).toBe("Paneer");
    expect(parsed!.canonicalKey).toBe("indian:paneer");
  });

  it("dedupes by canonicalKey and resolves all curated targets", () => {
    const foods = loadFixtureFoods();
    const result = resolveIndianCc0ImportCandidates(foods);
    expect(result.missingTargets).toEqual([]);
    expect(result.invalid).toBe(0);
    expect(result.candidates.length).toBe(INDIAN_CC0_IMPORT_TARGETS.length);
    const keys = new Set(result.candidates.map((c) => c.canonicalKey));
    expect(keys.size).toBe(result.candidates.length);
  });

  it("marks source as indian_cc0 on catalog docs", () => {
    const doc = indianFood({
      foodId: "indian_cc0:313",
      name: "Paneer",
      nameLower: "paneer",
      canonicalKey: "indian:paneer",
      displayName: "Paneer",
    });
    expect(doc.source).toBe("indian_cc0");
    expect(nutritionDisplayNameFromDoc(doc)).toBe("Paneer");
  });
});

describe("Indian + USDA search coexistence", () => {
  const usdaRice = indianFood({
    foodId: "usda:rice",
    name: "Rice, white, raw",
    nameLower: "rice, white, raw",
    canonicalKey: "rice:white:raw",
    displayName: "White Rice, Raw",
    source: "USDA",
  });
  const indianRice = indianFood({
    foodId: "indian_cc0:15",
    name: "Rice, raw, milled",
    nameLower: "rice, raw, milled",
    canonicalKey: "indian:rice:raw:milled",
    displayName: "Rice (Raw, Milled)",
    searchBoost: 92,
  });
  const paneer = indianFood({
    foodId: "indian_cc0:313",
    name: "Paneer",
    nameLower: "paneer",
    canonicalKey: "indian:paneer",
    displayName: "Paneer",
    searchBoost: 100,
  });

  it("ranks Indian paneer first for paneer query (case-insensitive)", () => {
    const ranked = rankNutritionFoodSearchResults("PANEER", [usdaRice, paneer]);
    expect(ranked[0]?.canonicalKey).toBe("indian:paneer");
  });

  it("supports partial paneer prefix via relevance gate", () => {
    expect(passesNutritionSearchRelevanceGate("pan", paneer)).toBe(true);
  });

  it("returns at most 8 results with Indian and USDA candidates", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      indianFood({
        foodId: `indian_cc0:${i}`,
        name: `Dal sample ${i}`,
        nameLower: `dal sample ${i}`,
        canonicalKey: `indian:dal:sample-${i}`,
        displayName: `Dal Sample ${i}`,
      }),
    );
    const results = rankNutritionFoodSearchResults("dal", many);
    expect(results.length).toBeLessThanOrEqual(NUTRITION_SEARCH_RESULT_LIMIT);
  });

  it("surfaces wheat atta for chapati query alongside USDA items", () => {
    const atta = indianFood({
      foodId: "indian_cc0:19",
      name: "Wheat flour, atta",
      nameLower: "wheat flour, atta",
      canonicalKey: "indian:wheat:atta",
      displayName: "Wheat Atta",
      searchBoost: 75,
    });
    expect(passesNutritionSearchRelevanceGate("chapati", atta)).toBe(true);
    const ranked = rankNutritionFoodSearchResults("chapati", [usdaRice, atta]);
    expect(ranked[0]?.displayName).toBe("Wheat Atta");
  });

  it("boosts Indian dal staples for dal query", () => {
    const toor = indianFood({
      foodId: "indian_cc0:1",
      name: "Red gram, dal",
      nameLower: "red gram, dal",
      canonicalKey: "indian:dal:toor",
      displayName: "Toor Dal",
      searchBoost: 98,
    });
    expect(
      scoreIndianCc0FoodSearch(["toor"], "indian:dal:toor", "toor dal"),
    ).toBeGreaterThan(
      scoreIndianCc0FoodSearch(["toor"], "indian:dal:moong", "moong dal"),
    );
    const ranked = rankNutritionFoodSearchResults("dal", [usdaRice, toor]);
    expect(ranked[0]?.canonicalKey).toBe("indian:dal:toor");
  });
});
