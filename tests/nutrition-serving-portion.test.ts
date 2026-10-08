import { describe, expect, it } from "vitest";

import { catalogDocToSearchResult } from "@/lib/nutrition/member-day";
import {
  deriveServingGramsFromIndbEnergy,
  resolveIndbServingPortion,
} from "@/lib/nutrition/nutrition-serving-portion";
import { resolveQuantityMode } from "@/lib/nutrition/quantity-ui";

describe("nutrition serving portion", () => {
  it("derives per-piece grams from INDB per-serving kcal without inventing weights", () => {
    const grams = deriveServingGramsFromIndbEnergy(137.535, 34.47);
    expect(grams).toBeCloseTo(25.06, 1);
  });

  it("enables count mode for idli with dosa-style INDB metadata", () => {
    const row = {
      foodId: "indb:ASC144",
      source: "indb" as const,
      sourceFoodId: "ASC144",
      name: "Idli",
      nameLower: "idli",
      category: "Indian recipe (ASC)",
      caloriesPer100g: 137.535,
      proteinPer100g: 4,
      carbsPer100g: 28,
      fatPer100g: 1,
      fiberPer100g: 0.5,
      servingSizeGrams: null,
      servingSizeLabel: "idli",
      aliases: [],
      searchPrefixes: [],
      sourceAttribution: {
        dataset: "INDB",
        version: "2024",
        url: "https://example.com",
        license: "test",
      },
      isActive: true,
      createdAt: {} as never,
      updatedAt: {} as never,
      indbMetadata: {
        foodCode: "ASC144",
        foodCodeOrg: null,
        primarysource: "asc_manual",
        recordType: "recipe" as const,
        recipeNameOrg: "Idli",
        ingredientSource: null,
        retentionFactor: null,
        nutrients: {
          per100g: { energy_kcal: 137.535 },
          perServing: { energy_kcal: 34.47 },
        },
        serving: { servingsUnit: "idli", numberOfServings: 4, sizeOfServing: 1, remarks1: null, remarks2: null },
        ingredients: null,
      },
    };

    const portion = resolveIndbServingPortion(row);
    expect(portion?.label).toBe("idli");
    expect(portion?.grams).toBeCloseTo(25.06, 1);

    const search = catalogDocToSearchResult(row);
    expect(resolveQuantityMode(search)).toBe("count");
    expect(search.servingSizeLabel).toBe("idli");
    expect(search.servingSizeGrams).toBeCloseTo(25.06, 1);
  });

  it("keeps bowl-based INDB recipes in grams mode", () => {
    const row = {
      foodId: "indb:BFP001",
      source: "indb" as const,
      sourceFoodId: "BFP001",
      name: "Tomato soup",
      nameLower: "tomato soup",
      category: "Indian recipe (BFP)",
      caloriesPer100g: 40,
      proteinPer100g: 1,
      carbsPer100g: 6,
      fatPer100g: 1,
      fiberPer100g: 1,
      servingSizeGrams: null,
      servingSizeLabel: "bowl",
      aliases: [],
      searchPrefixes: [],
      sourceAttribution: {
        dataset: "INDB",
        version: "2024",
        url: "https://example.com",
        license: "test",
      },
      isActive: true,
      createdAt: {} as never,
      updatedAt: {} as never,
      indbMetadata: {
        foodCode: "BFP001",
        foodCodeOrg: null,
        primarysource: "bfp_manual",
        recordType: "recipe" as const,
        recipeNameOrg: null,
        ingredientSource: null,
        retentionFactor: null,
        nutrients: {
          per100g: { energy_kcal: 40 },
          perServing: { energy_kcal: 120 },
        },
        serving: { servingsUnit: "bowl", numberOfServings: 1, sizeOfServing: 1, remarks1: null, remarks2: null },
        ingredients: null,
      },
    };

    expect(resolveIndbServingPortion(row)).toBeNull();
    expect(resolveQuantityMode(catalogDocToSearchResult(row))).toBe("grams");
  });
});
