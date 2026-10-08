import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import { buildIndbSearchAliases } from "@/lib/nutrition/indb-aliases";
import {
  indbFoodId,
  parseIndbNutrientCell,
  parseIndbRecipeRow,
  resolveIndbImportCandidates,
} from "@/lib/nutrition/indb-catalog";
import { scoreIndbFoodSearch } from "@/lib/nutrition/indb-search-boosts";
import {
  NUTRITION_SEARCH_RESULT_LIMIT,
  rankNutritionFoodSearchResults,
} from "@/lib/nutrition/food-search";

function loadFixtureBundle() {
  const filePath = resolve(
    process.cwd(),
    "tests/fixtures/indb/sample-bundle.json",
  );
  return JSON.parse(readFileSync(filePath, "utf8")) as {
    recipes: Record<string, unknown>[];
    ukIngredients: Record<string, unknown>[];
    usIngredients: Record<string, unknown>[];
    recipeIngredients: Record<string, unknown>[];
    servings: Record<string, unknown>[];
  };
}

function indbDoc(
  partial: Partial<NutritionFoodCatalogDoc> & {
    foodId: string;
    name: string;
    canonicalKey: string;
    displayName: string;
  },
): NutritionFoodCatalogDoc {
  return {
    source: "indb",
    sourceFoodId: partial.foodId.replace("indb:", ""),
    nameLower: partial.name.toLowerCase(),
    category: "Indian recipe (ASC)",
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
      dataset: "INDB",
      version: "2024",
      url: "https://example.com",
      license: "test",
    },
    isActive: true,
    createdAt: {} as NutritionFoodCatalogDoc["createdAt"],
    updatedAt: {} as NutritionFoodCatalogDoc["updatedAt"],
    searchBoost: 80,
    ...partial,
  };
}

describe("INDB catalog import", () => {
  it("uses stable indb:{food_code} ids", () => {
    expect(indbFoodId("ASC144")).toBe("indb:ASC144");
    expect(indbFoodId("G509")).toBe("indb:G509");
  });

  it("preserves Tr/NA nutrient cells without coercing to numbers", () => {
    expect(parseIndbNutrientCell("Tr")).toBe("Tr");
    expect(parseIndbNutrientCell("NA")).toBe("NA");
    expect(parseIndbNutrientCell(16.5)).toBe(16.5);
  });

  it("maps per-100g macros from INDB recipe rows", () => {
    const bundle = loadFixtureBundle();
    const row = bundle.recipes[0]!;
    const serving = bundle.servings[0]!;
    const ingredients = [
      {
        ingredientName: "Rice",
        amount: 100,
        unit: "g",
        foodCode: "A001",
        foodName: "Rice, raw",
      },
    ];
    const parsed = parseIndbRecipeRow(row, serving, ingredients);
    expect(parsed).not.toBeNull();
    expect(parsed!.caloriesPer100g).toBe(150.5);
    expect(parsed!.indb.nutrients.perServing.energy_kcal).toBe(37.6);
    expect(parsed!.indb.ingredients).toHaveLength(1);
    expect(parsed!.servingSizeLabel).toBe("piece");
  });

  it("dedupes by foodId when resolving import bundle", () => {
    const bundle = loadFixtureBundle();
    const duplicate = {
      ...bundle.recipes[0]!,
      food_name: "Duplicate idli row",
    };
    const resolved = resolveIndbImportCandidates({
      ...bundle,
      recipes: [...bundle.recipes, duplicate],
    });
    expect(resolved.candidates).toHaveLength(2);
    expect(resolved.duplicateFoodCodes).toBe(1);
  });

  it("builds English/local aliases from INDB names", () => {
    const aliases = buildIndbSearchAliases(
      "Chapati/Roti (Phulka)",
      ["Hot Tea"],
    );
    expect(aliases).toContain("Roti");
    expect(aliases).toContain("Phulka");
  });

  it("ranks INDB dosa ahead of unrelated foods for dosa query", () => {
    const dosa = indbDoc({
      foodId: "indb:ASC146",
      name: "Masala dosa",
      canonicalKey: "indb:asc146",
      displayName: "Masala dosa",
      searchBoost: 85,
    });
    const tea = indbDoc({
      foodId: "indb:ASC001",
      name: "Hot tea (Garam Chai)",
      canonicalKey: "indb:asc001",
      displayName: "Hot tea",
      searchBoost: 40,
    });
    const ranked = rankNutritionFoodSearchResults("dosa", [tea, dosa]);
    expect(ranked[0]?.foodId).toBe("indb:ASC146");
    expect(ranked.length).toBeLessThanOrEqual(NUTRITION_SEARCH_RESULT_LIMIT);
  });

  it("boosts idli and sambar dish queries", () => {
    const idliHay = "idli plain";
    expect(
      scoreIndbFoodSearch(["idli"], "indb:asc144", "idli", idliHay, ""),
    ).toBeGreaterThan(400);
    const sambarHay = "sambar vegetable";
    expect(
      scoreIndbFoodSearch(["sambar"], "indb:asc167", "sambar", sambarHay, ""),
    ).toBeGreaterThan(400);
  });
});
