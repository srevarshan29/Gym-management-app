import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";

/** Resolved portion used for count vs grams UI (may come from catalog or INDB metadata). */
export type NutritionServingPortion = {
  grams: number;
  label: string;
};

const INDB_VOLUME_OR_BULK_UNITS = new Set([
  "bowl",
  "plate",
  "cup",
  "glass",
  "tall glass",
  "soup bowl",
  "small bowl",
  "tablespoon",
  "teaspoon",
  "jar",
  "dish",
  "souffle dish",
]);

const INDB_DISCRETE_SERVING_UNITS = new Set([
  "piece",
  "dosa",
  "idli",
  "vada",
  "chapati",
  "roti",
  "parantha",
  "paratha",
  "poori",
  "puri",
  "pancake",
  "cutlet",
  "sandwich",
  "egg",
  "cookie",
  "biscuit",
  "ladoo",
  "triangle",
  "pattice",
  "samosa",
  "wada",
]);

const DISH_NAME_COUNT_PATTERN =
  /\b(dosa|idli|vada|wadai|chapati|roti|paratha|parantha|porotta|poori|puri|uttapam|appam|samosa|pakora|cutlet)\b/i;

const GRAMS_PER_SERVING_MIN = 4;
const GRAMS_PER_SERVING_MAX = 750;

export function deriveServingGramsFromIndbEnergy(
  caloriesPer100g: number,
  perServingKcal: unknown,
): number | null {
  const servingKcal = parsePositiveNumber(perServingKcal);
  if (servingKcal == null || caloriesPer100g <= 0) {
    return null;
  }
  const grams = (servingKcal / caloriesPer100g) * 100;
  if (!Number.isFinite(grams) || grams < GRAMS_PER_SERVING_MIN) {
    return null;
  }
  if (grams > GRAMS_PER_SERVING_MAX) {
    return null;
  }
  return Math.round(grams * 100) / 100;
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function normalizeUnit(unit: string | null | undefined): string {
  return (unit ?? "").trim().toLowerCase();
}

function countLabelFromUnitAndName(
  servingsUnit: string | null,
  foodName: string,
): string | null {
  const unit = normalizeUnit(servingsUnit);
  if (unit && INDB_DISCRETE_SERVING_UNITS.has(unit)) {
    return unit === "parantha" ? "paratha" : unit;
  }
  const match = foodName.match(DISH_NAME_COUNT_PATTERN);
  if (match?.[1]) {
    const token = match[1].toLowerCase();
    if (token === "parantha") return "paratha";
    if (token === "porotta") return "parotta";
    return token;
  }
  if (unit === "piece") {
    const fromName = foodName.match(DISH_NAME_COUNT_PATTERN);
    if (fromName?.[1]) {
      return fromName[1].toLowerCase();
    }
  }
  return null;
}

export function indbRecipeSupportsCountPortion(
  servingsUnit: string | null,
  foodName: string,
  servingGrams: number | null,
): boolean {
  if (servingGrams == null || servingGrams <= 0) {
    return false;
  }
  const unit = normalizeUnit(servingsUnit);
  if (unit && INDB_VOLUME_OR_BULK_UNITS.has(unit)) {
    return false;
  }
  if (unit && INDB_DISCRETE_SERVING_UNITS.has(unit)) {
    return true;
  }
  if (DISH_NAME_COUNT_PATTERN.test(foodName)) {
    return true;
  }
  return false;
}

export function resolveIndbServingPortion(
  row: Pick<
    NutritionFoodCatalogDoc,
    "name" | "caloriesPer100g" | "indbMetadata"
  >,
): NutritionServingPortion | null {
  const meta = row.indbMetadata;
  if (!meta || meta.recordType !== "recipe") {
    return null;
  }

  const perServingKcal = meta.nutrients.perServing.energy_kcal;
  const servingGrams = deriveServingGramsFromIndbEnergy(
    row.caloriesPer100g,
    perServingKcal,
  );
  if (servingGrams == null) {
    return null;
  }

  const servingsUnit =
    meta.serving?.servingsUnit ?? row.indbMetadata?.serving?.servingsUnit ?? null;

  if (
    !indbRecipeSupportsCountPortion(servingsUnit, row.name, servingGrams)
  ) {
    return null;
  }

  const label = countLabelFromUnitAndName(servingsUnit, row.name);
  if (!label) {
    return null;
  }

  return { grams: servingGrams, label };
}

/**
 * Catalog-level serving resolution (read-time only; does not mutate Firestore).
 */
export function resolveCatalogServingPortion(
  row: Pick<
    NutritionFoodCatalogDoc,
    | "name"
    | "caloriesPer100g"
    | "servingSizeGrams"
    | "servingSizeLabel"
    | "source"
    | "indbMetadata"
  >,
): NutritionServingPortion | null {
  if (
    row.servingSizeGrams != null &&
    row.servingSizeGrams > 0 &&
    row.servingSizeLabel?.trim()
  ) {
    return {
      grams: row.servingSizeGrams,
      label: row.servingSizeLabel.trim(),
    };
  }

  if (row.source === "indb") {
    return resolveIndbServingPortion(row);
  }

  return null;
}
