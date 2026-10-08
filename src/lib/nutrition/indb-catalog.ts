import { normalizeCatalogName } from "@/lib/exercises/catalog-search";
import { buildIndbSearchAliases } from "@/lib/nutrition/indb-aliases";
import { indbSearchBoostFromName } from "@/lib/nutrition/indb-search-boosts";

export type IndbRecordType = "recipe" | "ingredient";

export type IndbNutrientFieldValue = number | string | null;

export type IndbNutrientSnapshot = {
  per100g: Record<string, IndbNutrientFieldValue>;
  perServing: Record<string, IndbNutrientFieldValue>;
};

export type IndbIngredientLine = {
  ingredientName: string;
  amount: number | null;
  unit: string | null;
  foodCode: string | null;
  foodName: string | null;
};

export type IndbServingMetadata = {
  servingsUnit: string | null;
  numberOfServings: number | null;
  sizeOfServing: number | null;
  remarks1: string | null;
  remarks2: string | null;
};

export type NutritionIndbMetadata = {
  foodCode: string;
  foodCodeOrg: string | null;
  primarysource: string;
  recordType: IndbRecordType;
  recipeNameOrg: string | null;
  ingredientSource: "uk_fct" | "us_fct" | null;
  retentionFactor: string | null;
  nutrients: IndbNutrientSnapshot;
  serving: IndbServingMetadata | null;
  ingredients: IndbIngredientLine[] | null;
};

export type ParsedIndbCandidate = {
  foodId: string;
  sourceFoodId: string;
  name: string;
  nameLower: string;
  canonicalKey: string;
  displayName: string;
  searchBoost: number;
  category: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  servingSizeGrams: number | null;
  servingSizeLabel: string | null;
  aliases: string[];
  indb: NutritionIndbMetadata;
};

export type IndbRecipeRow = Record<string, unknown>;
export type IndbIngredientRow = Record<string, unknown>;
export type IndbRecipeIngredientRow = Record<string, unknown>;
export type IndbServingRow = Record<string, unknown>;

const PER100G_NUTRIENT_KEYS = [
  "energy_kj",
  "energy_kcal",
  "carb_g",
  "protein_g",
  "fat_g",
  "freesugar_g",
  "fibre_g",
  "sfa_mg",
  "mufa_mg",
  "pufa_mg",
  "cholesterol_mg",
  "calcium_mg",
  "phosphorus_mg",
  "magnesium_mg",
  "sodium_mg",
  "potassium_mg",
  "iron_mg",
  "copper_mg",
  "selenium_ug",
  "chromium_mg",
  "manganese_mg",
  "molybdenum_mg",
  "zinc_mg",
  "vita_ug",
  "vite_mg",
  "vitd2_ug",
  "vitd3_ug",
  "vitk1_ug",
  "vitk2_ug",
  "folate_ug",
  "vitb1_mg",
  "vitb2_mg",
  "vitb3_mg",
  "vitb5_mg",
  "vitb6_mg",
  "vitb7_ug",
  "vitb9_ug",
  "vitc_mg",
  "carotenoids_ug",
] as const;

const PER_SERVING_PREFIX = "unit_serving_";

export function indbFoodId(foodCode: string): string {
  const code = foodCode.trim();
  if (!code) {
    throw new Error("INDB food_code is required for foodId.");
  }
  return `indb:${code}`;
}

export function indbCanonicalKey(foodCode: string): string {
  return `indb:${foodCode.trim().toLowerCase()}`;
}

/**
 * Parse INDB scalar nutrient cells (numbers, Tr, N, NA preserved as strings).
 */
export function parseIndbNutrientCell(raw: unknown): IndbNutrientFieldValue {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const upper = trimmed.toUpperCase();
    if (upper === "NA" || upper === "N" || upper === "TR") {
      return trimmed;
    }
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) return asNumber;
    return trimmed;
  }
  return null;
}

export function parseIndbNumericNutrient(raw: unknown): number | null {
  const parsed = parseIndbNutrientCell(raw);
  if (typeof parsed === "number" && Number.isFinite(parsed)) {
    return parsed;
  }
  return null;
}

export function extractIndbNutrientSnapshot(
  row: Record<string, unknown>,
): IndbNutrientSnapshot {
  const per100g: Record<string, IndbNutrientFieldValue> = {};
  const perServing: Record<string, IndbNutrientFieldValue> = {};

  for (const key of PER100G_NUTRIENT_KEYS) {
    per100g[key] = parseIndbNutrientCell(row[key]);
  }

  for (const key of PER100G_NUTRIENT_KEYS) {
    const servingKey = `${PER_SERVING_PREFIX}${key}`;
    perServing[key] = parseIndbNutrientCell(row[servingKey]);
  }

  return { per100g, perServing };
}

function stringField(row: Record<string, unknown>, key: string): string | null {
  const raw = row[key];
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  return text.length ? text : null;
}

function categoryForPrimarySource(
  primarysource: string,
  recordType: IndbRecordType,
): string | null {
  if (recordType === "ingredient") {
    if (primarysource === "ukfct") return "INDB ingredient (UK FCT)";
    if (primarysource === "usda") return "INDB ingredient (USDA gap-fill)";
    return "INDB ingredient";
  }
  if (primarysource === "asc_manual") return "Indian recipe (ASC)";
  if (primarysource === "bfp_manual") return "Indian recipe (BFP)";
  if (primarysource === "open_source_recipes") return "Indian recipe (OSR)";
  return "Indian recipe (INDB)";
}

function displayNameFromIndbName(foodName: string): string {
  const withoutParen = foodName.split("(")[0]?.trim() || foodName.trim();
  const primary = withoutParen.split("/")[0]?.trim() || withoutParen;
  return primary;
}

function computeSearchBoost(
  recordType: IndbRecordType,
  foodName: string,
  aliases: string[],
): number {
  return indbSearchBoostFromName(recordType, foodName, aliases);
}

export function parseIndbRecipeRow(
  row: IndbRecipeRow,
  servingRow?: IndbServingRow | null,
  ingredientLines?: IndbIngredientLine[] | null,
  nameExtras?: string[],
): ParsedIndbCandidate | null {
  const foodCode = stringField(row, "food_code");
  const foodName = stringField(row, "food_name");
  const primarysource = stringField(row, "primarysource") ?? "unknown";

  if (!foodCode || !foodName) return null;

  const nutrients = extractIndbNutrientSnapshot(row);
  const caloriesPer100g = parseIndbNumericNutrient(nutrients.per100g.energy_kcal);
  const proteinPer100g = parseIndbNumericNutrient(nutrients.per100g.protein_g) ?? 0;
  const carbsPer100g = parseIndbNumericNutrient(nutrients.per100g.carb_g) ?? 0;
  const fatPer100g = parseIndbNumericNutrient(nutrients.per100g.fat_g) ?? 0;
  const fiberPer100g = parseIndbNumericNutrient(nutrients.per100g.fibre_g) ?? 0;

  if (caloriesPer100g === null || caloriesPer100g < 0) {
    return null;
  }

  const aliases = buildIndbSearchAliases(foodName, nameExtras ?? []);
  const displayName = displayNameFromIndbName(foodName);
  const servingsUnit =
    stringField(row, "servings_unit") ??
    (servingRow ? stringField(servingRow, "servings_unit") : null);

  const serving: IndbServingMetadata | null = servingRow
    ? {
        servingsUnit,
        numberOfServings: parseIndbNumericNutrient(servingRow.no_of_servings),
        sizeOfServing: parseIndbNumericNutrient(servingRow.size_of_servings),
        remarks1: stringField(servingRow, "remarks_1"),
        remarks2: stringField(servingRow, "remarks_2"),
      }
    : servingsUnit
      ? {
          servingsUnit,
          numberOfServings: null,
          sizeOfServing: null,
          remarks1: null,
          remarks2: null,
        }
      : null;

  const indb: NutritionIndbMetadata = {
    foodCode,
    foodCodeOrg: stringField(row, "food_code_org"),
    primarysource,
    recordType: "recipe",
    recipeNameOrg: servingRow
      ? stringField(servingRow, "recipe_name_org")
      : stringField(row, "recipe_name_org"),
    ingredientSource: null,
    retentionFactor: null,
    nutrients,
    serving,
    ingredients: ingredientLines?.length ? ingredientLines : null,
  };

  return {
    foodId: indbFoodId(foodCode),
    sourceFoodId: foodCode,
    name: foodName,
    nameLower: normalizeCatalogName(foodName),
    canonicalKey: indbCanonicalKey(foodCode),
    displayName,
    searchBoost: computeSearchBoost("recipe", foodName, aliases),
    category: categoryForPrimarySource(primarysource, "recipe"),
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fiberPer100g,
    servingSizeGrams: null,
    servingSizeLabel: servingsUnit,
    aliases,
    indb,
  };
}

export function parseIndbIngredientRow(
  row: IndbIngredientRow,
  ingredientSource: "uk_fct" | "us_fct",
): ParsedIndbCandidate | null {
  const foodCode = stringField(row, "food_code");
  const foodName = stringField(row, "food_name");
  const primarysource = stringField(row, "primarysource") ?? ingredientSource;

  if (!foodCode || !foodName) return null;

  const nutrients = extractIndbNutrientSnapshot(row);
  const caloriesPer100g = parseIndbNumericNutrient(nutrients.per100g.energy_kcal);
  const proteinPer100g = parseIndbNumericNutrient(nutrients.per100g.protein_g) ?? 0;
  const carbsPer100g = parseIndbNumericNutrient(nutrients.per100g.carb_g) ?? 0;
  const fatPer100g = parseIndbNumericNutrient(nutrients.per100g.fat_g) ?? 0;
  const fiberPer100g = parseIndbNumericNutrient(nutrients.per100g.fibre_g) ?? 0;

  if (caloriesPer100g === null || caloriesPer100g < 0) {
    return null;
  }

  const aliases = buildIndbSearchAliases(foodName, []);
  const displayName = displayNameFromIndbName(foodName);

  const indb: NutritionIndbMetadata = {
    foodCode,
    foodCodeOrg: stringField(row, "food_code_org"),
    primarysource,
    recordType: "ingredient",
    recipeNameOrg: null,
    ingredientSource,
    retentionFactor: stringField(row, "retention_factor"),
    nutrients,
    serving: null,
    ingredients: null,
  };

  return {
    foodId: indbFoodId(foodCode),
    sourceFoodId: foodCode,
    name: foodName,
    nameLower: normalizeCatalogName(foodName),
    canonicalKey: indbCanonicalKey(foodCode),
    displayName,
    searchBoost: computeSearchBoost("ingredient", foodName, aliases),
    category: categoryForPrimarySource(primarysource, "ingredient"),
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fiberPer100g,
    servingSizeGrams: null,
    servingSizeLabel: null,
    aliases,
    indb,
  };
}

export function groupIndbRecipeIngredients(
  rows: IndbRecipeIngredientRow[],
): Map<string, IndbIngredientLine[]> {
  const byRecipe = new Map<string, IndbIngredientLine[]>();

  for (const row of rows) {
    const recipeCode = stringField(row, "recipe_code");
    if (!recipeCode) continue;

    const line: IndbIngredientLine = {
      ingredientName:
        stringField(row, "ingredient_name_org") ??
        stringField(row, "food_name") ??
        "",
      amount: parseIndbNumericNutrient(row.amount),
      unit: stringField(row, "unit"),
      foodCode: stringField(row, "food_code"),
      foodName: stringField(row, "food_name"),
    };

    if (!line.ingredientName) continue;

    const list = byRecipe.get(recipeCode) ?? [];
    list.push(line);
    byRecipe.set(recipeCode, list);
  }

  return byRecipe;
}

export type IndbImportResolveResult = {
  candidates: ParsedIndbCandidate[];
  invalid: number;
  duplicateFoodCodes: number;
  countsByPrimarySource: Record<string, number>;
  countsByRecordType: Record<IndbRecordType, number>;
};

export function resolveIndbImportCandidates(input: {
  recipes: IndbRecipeRow[];
  ukIngredients: IndbIngredientRow[];
  usIngredients: IndbIngredientRow[];
  recipeIngredients: IndbRecipeIngredientRow[];
  servings: IndbServingRow[];
}): IndbImportResolveResult {
  const ingredientsByRecipe = groupIndbRecipeIngredients(input.recipeIngredients);
  const servingsByCode = new Map<string, IndbServingRow>();
  for (const row of input.servings) {
    const code = stringField(row, "recipe_code");
    if (code) servingsByCode.set(code, row);
  }

  const byFoodId = new Map<string, ParsedIndbCandidate>();
  let invalid = 0;
  let duplicateFoodCodes = 0;

  for (const row of input.recipes) {
    const foodCode = stringField(row, "food_code");
    const parsed = parseIndbRecipeRow(
      row,
      foodCode ? servingsByCode.get(foodCode) : null,
      foodCode ? ingredientsByRecipe.get(foodCode) ?? null : null,
    );
    if (!parsed) {
      invalid += 1;
      continue;
    }
    if (byFoodId.has(parsed.foodId)) {
      duplicateFoodCodes += 1;
      continue;
    }
    byFoodId.set(parsed.foodId, parsed);
  }

  for (const row of input.ukIngredients) {
    const parsed = parseIndbIngredientRow(row, "uk_fct");
    if (!parsed) {
      invalid += 1;
      continue;
    }
    if (byFoodId.has(parsed.foodId)) {
      duplicateFoodCodes += 1;
      continue;
    }
    byFoodId.set(parsed.foodId, parsed);
  }

  for (const row of input.usIngredients) {
    const parsed = parseIndbIngredientRow(row, "us_fct");
    if (!parsed) {
      invalid += 1;
      continue;
    }
    if (byFoodId.has(parsed.foodId)) {
      duplicateFoodCodes += 1;
      continue;
    }
    byFoodId.set(parsed.foodId, parsed);
  }

  const candidates = [...byFoodId.values()];
  const countsByPrimarySource: Record<string, number> = {};
  const countsByRecordType: Record<IndbRecordType, number> = {
    recipe: 0,
    ingredient: 0,
  };

  for (const candidate of candidates) {
    countsByRecordType[candidate.indb.recordType] += 1;
    const source = candidate.indb.primarysource;
    countsByPrimarySource[source] = (countsByPrimarySource[source] ?? 0) + 1;
  }

  return {
    candidates,
    invalid,
    duplicateFoodCodes,
    countsByPrimarySource,
    countsByRecordType,
  };
}
