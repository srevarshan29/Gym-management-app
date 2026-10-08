import { normalizeCatalogName } from "@/lib/exercises/catalog-search";
import {
  INDIAN_CC0_IMPORT_TARGETS,
  SOUTH_INDIAN_DISHES_MISSING_FROM_CC0,
  type IndianCc0ImportTarget,
  USDA_CANONICAL_OVERLAP_FOR_INDIAN,
} from "@/lib/nutrition/indian-cc0-priority";

export type IndianCc0FoodRow = {
  id: number;
  code?: string;
  name: string;
  nameHindi?: string;
  category?: string;
  energy: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber?: number;
  source?: string;
};

export type ParsedIndianCc0Candidate = {
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
  servingSizeGrams: null;
  servingSizeLabel: null;
  aliases: string[];
  priorityLabel: string;
};

export type IndianCc0Dataset = {
  foods: IndianCc0FoodRow[];
};

export function loadIndianCc0FoodsFromJson(raw: unknown): IndianCc0FoodRow[] {
  if (!raw || typeof raw !== "object") {
    throw new Error("Unrecognized Indian CC0 JSON structure.");
  }
  const record = raw as IndianCc0Dataset;
  if (!Array.isArray(record.foods)) {
    throw new Error("Indian CC0 JSON missing foods array.");
  }
  return record.foods;
}

export function indianCc0FoodId(sourceId: number | string): string {
  return `indian_cc0:${sourceId}`;
}

export function parseIndianCc0Row(
  row: IndianCc0FoodRow,
  target: IndianCc0ImportTarget,
): ParsedIndianCc0Candidate | null {
  const caloriesPer100g = Number(row.energy);
  const proteinPer100g = Number(row.protein);
  const carbsPer100g = Number(row.carbs);
  const fatPer100g = Number(row.fat);
  const fiberPer100g = Number(row.fiber ?? 0);

  if (
    !Number.isFinite(caloriesPer100g) ||
    caloriesPer100g <= 0 ||
    !Number.isFinite(proteinPer100g) ||
    !Number.isFinite(carbsPer100g) ||
    !Number.isFinite(fatPer100g)
  ) {
    return null;
  }

  const name = row.name.trim();
  if (!name) return null;

  const aliases = [
    ...(target.aliases ?? []),
    row.nameHindi?.trim() ?? "",
  ].filter(Boolean);

  return {
    foodId: indianCc0FoodId(row.id),
    sourceFoodId: String(row.id),
    name,
    nameLower: normalizeCatalogName(name),
    canonicalKey: target.canonicalKey,
    displayName: target.memberDisplayName,
    searchBoost: target.searchBoost,
    category: row.category?.trim() ?? null,
    caloriesPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fiberPer100g,
    servingSizeGrams: null,
    servingSizeLabel: null,
    aliases,
    priorityLabel: target.priorityLabel,
  };
}

export type IndianCc0ResolveResult = {
  candidates: ParsedIndianCc0Candidate[];
  missingTargets: string[];
  invalid: number;
  duplicatesSkipped: number;
};

/**
 * Resolve curated import targets against a loaded CC0 foods list (one winner per canonicalKey).
 */
export function resolveIndianCc0ImportCandidates(
  foods: IndianCc0FoodRow[],
): IndianCc0ResolveResult {
  const byName = new Map<string, IndianCc0FoodRow>();
  for (const row of foods) {
    byName.set(normalizeCatalogName(row.name), row);
  }

  const bestByCanonical = new Map<string, ParsedIndianCc0Candidate>();
  const missingTargets: string[] = [];
  let invalid = 0;
  let duplicatesSkipped = 0;

  for (const target of INDIAN_CC0_IMPORT_TARGETS) {
    const row = byName.get(normalizeCatalogName(target.datasetName));
    if (!row) {
      missingTargets.push(`${target.priorityLabel}: ${target.datasetName}`);
      continue;
    }
    const parsed = parseIndianCc0Row(row, target);
    if (!parsed) {
      invalid += 1;
      continue;
    }
    const existing = bestByCanonical.get(parsed.canonicalKey);
    if (!existing) {
      bestByCanonical.set(parsed.canonicalKey, parsed);
      continue;
    }
    if (parsed.searchBoost > existing.searchBoost) {
      bestByCanonical.set(parsed.canonicalKey, parsed);
    }
    duplicatesSkipped += 1;
  }

  return {
    candidates: [...bestByCanonical.values()],
    missingTargets,
    invalid,
    duplicatesSkipped,
  };
}

export function usdaCanonicalOverlapsForIndian(
  canonicalKey: string,
): string[] {
  return USDA_CANONICAL_OVERLAP_FOR_INDIAN[canonicalKey] ?? [];
}

export function southIndianPriorityImported(
  candidates: ParsedIndianCc0Candidate[],
): { found: string[]; missing: readonly string[] } {
  const importedLabels = new Set(candidates.map((c) => c.priorityLabel));
  const found = [...importedLabels];
  const stapleMissing = (["Rice", "Paneer", "Curd", "Dal"] as const).filter(
    (label) => !importedLabels.has(label),
  );
  return {
    found,
    missing: [...stapleMissing, ...SOUTH_INDIAN_DISHES_MISSING_FROM_CC0],
  };
}
