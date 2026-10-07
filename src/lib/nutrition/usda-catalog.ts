import { normalizeCatalogName } from "@/lib/exercises/catalog-search";
import {
  computeNutritionCanonicalKey,
  nutritionDisplayNameForFood,
  nutritionSearchBoostForCanonical,
} from "@/lib/nutrition/nutrition-canonical";

export const USDA_NUTRIENT_ENERGY_KCAL = 1008;
export const USDA_NUTRIENT_PROTEIN = 1003;
export const USDA_NUTRIENT_CARBS = 1005;
export const USDA_NUTRIENT_FAT = 1004;
export const USDA_NUTRIENT_FIBER = 1079;

export type UsdaDatasetKind = "foundation" | "sr_legacy" | "fndds" | "other";

export type UsdaNutrientRow = {
  nutrient?: { id?: number; name?: string; unitName?: string };
  amount?: number;
};

export type UsdaMeasureUnit = {
  name?: string;
  abbreviation?: string;
};

export type UsdaFoodPortion = {
  gramWeight?: number;
  portionDescription?: string | null;
  modifier?: string | null;
  measureUnit?: UsdaMeasureUnit | null;
  amount?: number;
  value?: number;
};

export type UsdaFoodRow = {
  fdcId?: number;
  description?: string;
  foodCategory?: string | { description?: string };
  foodNutrients?: UsdaNutrientRow[];
  foodPortions?: UsdaFoodPortion[];
};

export type ParsedUsdaCatalogCandidate = {
  fdcId: number;
  foodId: string;
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
  datasetKind: UsdaDatasetKind;
};

const DATASET_PRIORITY: Record<UsdaDatasetKind, number> = {
  foundation: 3000,
  sr_legacy: 2000,
  fndds: 1000,
  other: 500,
};

export function usdaNutrientAmount(
  rows: UsdaNutrientRow[] | undefined,
  nutrientId: number,
): number {
  if (!rows) return 0;
  for (const row of rows) {
    if (row.nutrient?.id === nutrientId && row.amount != null) {
      return Number(row.amount);
    }
  }
  return 0;
}

export function usdaFoodCategoryLabel(food: UsdaFoodRow): string | null {
  if (!food.foodCategory) return null;
  if (typeof food.foodCategory === "string") {
    return food.foodCategory.trim() || null;
  }
  return food.foodCategory.description?.trim() || null;
}

function portionLabel(portion: UsdaFoodPortion): string | null {
  const fromDescription = [
    portion.portionDescription,
    portion.modifier,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromDescription) return fromDescription;

  const unitName = portion.measureUnit?.name?.trim();
  if (!unitName) return null;

  const amount = portion.amount ?? portion.value;
  if (amount != null && amount > 0 && amount !== 1) {
    return `${amount} ${unitName}`;
  }
  return unitName;
}

export function pickUsdaServing(food: UsdaFoodRow): {
  servingSizeGrams: number | null;
  servingSizeLabel: string | null;
} {
  const portions = food.foodPortions ?? [];
  const withWeight = portions.filter((p) => p.gramWeight && p.gramWeight > 0);
  if (withWeight.length === 0) {
    return { servingSizeGrams: null, servingSizeLabel: null };
  }

  const preferred =
    withWeight.find((p) => {
      const label = portionLabel(p)?.toLowerCase() ?? "";
      return /\begg\b|large|medium|cup|tablespoon|slice|piece|racc\b/.test(
        label,
      );
    }) ?? withWeight[0]!;

  return {
    servingSizeGrams: preferred.gramWeight ?? null,
    servingSizeLabel: portionLabel(preferred),
  };
}

const LOW_VALUE_NAME_RE =
  /\b(infant formula|baby food|babyfood|enteral|tube feeding|simulated|imitation|restructured|mechanically separated|by-products only)\b/i;

export function isLowValueUsdaFood(description: string): boolean {
  const trimmed = description.trim();
  if (trimmed.length < 3) return true;
  if (LOW_VALUE_NAME_RE.test(trimmed)) return true;
  return false;
}

export function datasetKindFromLabel(dataset: string): UsdaDatasetKind {
  const d = dataset.toLowerCase();
  if (d.includes("foundation")) return "foundation";
  if (d.includes("sr legacy") || d.includes("sr_legacy")) return "sr_legacy";
  if (d.includes("fndds")) return "fndds";
  return "other";
}

export function parseUsdaFoodRow(
  food: UsdaFoodRow,
  dataset: string,
): ParsedUsdaCatalogCandidate | null {
  const fdcId = food.fdcId;
  const name = food.description?.trim();
  if (!fdcId || !name) return null;
  if (isLowValueUsdaFood(name)) return null;

  const caloriesPer100g = usdaNutrientAmount(
    food.foodNutrients,
    USDA_NUTRIENT_ENERGY_KCAL,
  );
  if (caloriesPer100g <= 0) return null;

  const canonicalKey = computeNutritionCanonicalKey(name);
  const displayName = nutritionDisplayNameForFood(name, canonicalKey);
  const searchBoost = nutritionSearchBoostForCanonical(canonicalKey);
  const serving = pickUsdaServing(food);
  const datasetKind = datasetKindFromLabel(dataset);

  return {
    fdcId,
    foodId: `usda:${fdcId}`,
    name,
    nameLower: normalizeCatalogName(name),
    canonicalKey,
    displayName,
    searchBoost,
    category: usdaFoodCategoryLabel(food),
    caloriesPer100g,
    proteinPer100g: usdaNutrientAmount(food.foodNutrients, USDA_NUTRIENT_PROTEIN),
    carbsPer100g: usdaNutrientAmount(food.foodNutrients, USDA_NUTRIENT_CARBS),
    fatPer100g: usdaNutrientAmount(food.foodNutrients, USDA_NUTRIENT_FAT),
    fiberPer100g: usdaNutrientAmount(food.foodNutrients, USDA_NUTRIENT_FIBER),
    servingSizeGrams: serving.servingSizeGrams,
    servingSizeLabel: serving.servingSizeLabel,
    datasetKind,
  };
}

export function usdaImportQualityScore(candidate: ParsedUsdaCatalogCandidate): number {
  let score = DATASET_PRIORITY[candidate.datasetKind];
  score += candidate.searchBoost * 15;
  if (candidate.servingSizeGrams) score += 25;
  if (candidate.servingSizeLabel) score += 20;

  const n = candidate.nameLower;
  if (/\braw\b/.test(n) && !/\bfrozen|dried|pasteurized|powder\b/.test(n)) {
    score += 40;
  }
  if (/\bfrozen|dried|pasteurized|powder|dehydrated\b/.test(n)) {
    score -= 50;
  }
  if (/\bskinless\b/.test(n)) score += 10;
  score -= Math.min(candidate.name.length, 140) / 12;
  return score;
}

export function loadUsdaFoodRowsFromJson(raw: unknown): UsdaFoodRow[] {
  if (Array.isArray(raw)) return raw as UsdaFoodRow[];
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) return value as UsdaFoodRow[];
    }
  }
  throw new Error("Unrecognized USDA JSON structure.");
}

export type UsdaImportDedupeResult = {
  winners: ParsedUsdaCatalogCandidate[];
  duplicatesSkipped: number;
  lowValueSkipped: number;
  invalidSkipped: number;
};

/**
 * Parse rows, drop low-value entries, and keep one winner per canonicalKey.
 */
export function dedupeUsdaCatalogCandidates(
  rows: UsdaFoodRow[],
  dataset: string,
): UsdaImportDedupeResult {
  const bestByCanonical = new Map<string, ParsedUsdaCatalogCandidate>();
  let duplicatesSkipped = 0;
  let lowValueSkipped = 0;
  let invalidSkipped = 0;

  for (const row of rows) {
    const name = row.description?.trim() ?? "";
    if (name && isLowValueUsdaFood(name)) {
      lowValueSkipped += 1;
      continue;
    }

    const parsed = parseUsdaFoodRow(row, dataset);
    if (!parsed) {
      invalidSkipped += 1;
      continue;
    }

    const existing = bestByCanonical.get(parsed.canonicalKey);
    if (!existing) {
      bestByCanonical.set(parsed.canonicalKey, parsed);
      continue;
    }

    const existingScore = usdaImportQualityScore(existing);
    const nextScore = usdaImportQualityScore(parsed);
    if (nextScore > existingScore) {
      bestByCanonical.set(parsed.canonicalKey, parsed);
    }
    duplicatesSkipped += 1;
  }

  return {
    winners: [...bestByCanonical.values()],
    duplicatesSkipped,
    lowValueSkipped,
    invalidSkipped,
  };
}

export type UsdaCatalogSourceInput = {
  rows: UsdaFoodRow[];
  dataset: string;
};

/**
 * Same cross-file canonical dedupe used by the USDA import script (one winner per canonicalKey).
 */
export type UsdaCatalogMergedWinner = {
  candidate: ParsedUsdaCatalogCandidate;
  dataset: string;
};

export function mergeUsdaCatalogSources(sources: UsdaCatalogSourceInput[]): {
  winners: UsdaCatalogMergedWinner[];
  duplicatesSkipped: number;
  lowValueSkipped: number;
  invalidSkipped: number;
} {
  const bestByCanonical = new Map<string, UsdaCatalogMergedWinner>();
  let duplicatesSkipped = 0;
  let lowValueSkipped = 0;
  let invalidSkipped = 0;

  for (const source of sources) {
    const result = dedupeUsdaCatalogCandidates(source.rows, source.dataset);
    lowValueSkipped += result.lowValueSkipped;
    invalidSkipped += result.invalidSkipped;

    for (const candidate of result.winners) {
      const existing = bestByCanonical.get(candidate.canonicalKey);
      if (!existing) {
        bestByCanonical.set(candidate.canonicalKey, {
          candidate,
          dataset: source.dataset,
        });
        continue;
      }

      const existingScore = usdaImportQualityScore(existing.candidate);
      const nextScore = usdaImportQualityScore(candidate);
      if (nextScore > existingScore) {
        bestByCanonical.set(candidate.canonicalKey, {
          candidate,
          dataset: source.dataset,
        });
      }
      duplicatesSkipped += 1;
    }

    duplicatesSkipped += result.duplicatesSkipped;
  }

  return {
    winners: [...bestByCanonical.values()],
    duplicatesSkipped,
    lowValueSkipped,
    invalidSkipped,
  };
}

export function canonicalWinnerFoodIds(
  sources: UsdaCatalogSourceInput[],
): Set<string> {
  const { winners } = mergeUsdaCatalogSources(sources);
  return new Set(winners.map((w) => w.candidate.foodId));
}
