/**
 * Import a USDA FoodData Central JSON subset into Firestore nutritionFoodCatalog.
 *
 * Download Foundation Foods (recommended) from:
 * https://fdc.nal.usda.gov/download-datasets.html
 *
 * Usage:
 *   npm run db:import:usda-nutrition -- --file ./data/Foundation_Foods.json --max 2500
 *   npm run db:import:usda-nutrition -- --file ./data/FNDDS.json --dataset FNDDS --max 1500
 *
 * Options:
 *   --file <path>     Required JSON file (array or { FoundationFoods: [] } style)
 *   --max <n>         Max foods to import (default 2000)
 *   --dry-run         Parse only, no writes
 *   --dataset <name>  Attribution dataset label (default Foundation Foods)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Timestamp } from "firebase-admin/firestore";

import { getFirestoreDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { omitUndefined } from "@/lib/firestore/serialize";
import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import {
  buildCatalogSearchPrefixes,
  normalizeCatalogName,
} from "@/lib/exercises/catalog-search";
import { USDA_FOODDATA_CENTRAL_ATTRIBUTION } from "@/lib/nutrition/attribution";

const NUTRIENT_ENERGY_KCAL = 1008;
const NUTRIENT_PROTEIN = 1003;
const NUTRIENT_CARBS = 1005;
const NUTRIENT_FAT = 1004;
const NUTRIENT_FIBER = 1079;

type UsdaNutrientRow = {
  nutrient?: { id?: number; name?: string; unitName?: string };
  amount?: number;
};

type UsdaFoodPortion = {
  gramWeight?: number;
  portionDescription?: string;
  modifier?: string;
};

type UsdaFoodRow = {
  fdcId?: number;
  description?: string;
  foodCategory?: string | { description?: string };
  foodNutrients?: UsdaNutrientRow[];
  foodPortions?: UsdaFoodPortion[];
};

function parseArgs(argv: string[]) {
  const args = new Map<string, string>();
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token?.startsWith("--")) {
      const value = argv[i + 1];
      if (value && !value.startsWith("--")) {
        args.set(token.slice(2), value);
        i += 1;
      }
    }
  }
  return {
    file: args.get("file"),
    max: Number(args.get("max") ?? "2000"),
    dataset: args.get("dataset") ?? "Foundation Foods",
    dryRun,
  };
}

function nutrientAmount(
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

function foodCategoryLabel(food: UsdaFoodRow): string | null {
  if (!food.foodCategory) return null;
  if (typeof food.foodCategory === "string") {
    return food.foodCategory.trim() || null;
  }
  return food.foodCategory.description?.trim() || null;
}

function pickServing(food: UsdaFoodRow): {
  servingSizeGrams: number | null;
  servingSizeLabel: string | null;
} {
  const portions = food.foodPortions ?? [];
  const withWeight = portions.filter((p) => p.gramWeight && p.gramWeight > 0);
  if (withWeight.length === 0) {
    return { servingSizeGrams: null, servingSizeLabel: null };
  }
  const portion = withWeight[0]!;
  const label =
    [portion.portionDescription, portion.modifier].filter(Boolean).join(" ") ||
    null;
  return {
    servingSizeGrams: portion.gramWeight ?? null,
    servingSizeLabel: label,
  };
}

function loadFoodRows(filePath: string): UsdaFoodRow[] {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  if (Array.isArray(raw)) return raw as UsdaFoodRow[];
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) return value as UsdaFoodRow[];
    }
  }
  throw new Error("Unrecognized USDA JSON structure.");
}

function toCatalogDoc(
  food: UsdaFoodRow,
  dataset: string,
): NutritionFoodCatalogDoc | null {
  const fdcId = food.fdcId;
  const name = food.description?.trim();
  if (!fdcId || !name) return null;

  const caloriesPer100g = nutrientAmount(food.foodNutrients, NUTRIENT_ENERGY_KCAL);
  if (caloriesPer100g <= 0) return null;

  const serving = pickServing(food);
  const now = Timestamp.now();
  const foodId = `usda:${fdcId}`;

  return omitUndefined({
    foodId,
    source: "USDA",
    sourceFoodId: String(fdcId),
    name,
    nameLower: normalizeCatalogName(name),
    category: foodCategoryLabel(food),
    caloriesPer100g,
    proteinPer100g: nutrientAmount(food.foodNutrients, NUTRIENT_PROTEIN),
    carbsPer100g: nutrientAmount(food.foodNutrients, NUTRIENT_CARBS),
    fatPer100g: nutrientAmount(food.foodNutrients, NUTRIENT_FAT),
    fiberPer100g: nutrientAmount(food.foodNutrients, NUTRIENT_FIBER),
    servingSizeGrams: serving.servingSizeGrams,
    servingSizeLabel: serving.servingSizeLabel,
    aliases: [],
    searchPrefixes: buildCatalogSearchPrefixes(name),
    sourceAttribution: {
      dataset,
      version: null,
      url: USDA_FOODDATA_CENTRAL_ATTRIBUTION.url,
      license: USDA_FOODDATA_CENTRAL_ATTRIBUTION.license,
    },
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

async function main() {
  const { file, max, dataset, dryRun } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error("Missing --file <path>");
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), file);
  const rows = loadFoodRows(filePath);
  const docs: NutritionFoodCatalogDoc[] = [];

  for (const row of rows) {
    if (docs.length >= max) break;
    const doc = toCatalogDoc(row, dataset);
    if (doc) docs.push(doc);
  }

  console.log(`Prepared ${docs.length} foods from ${filePath}`);
  if (dryRun) {
    console.log("Dry run — no Firestore writes.");
    return;
  }

  const db = getFirestoreDb();
  const col = db.collection(COLLECTIONS.nutritionFoodCatalog);
  const BATCH = 400;
  let written = 0;

  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH);
    for (const doc of chunk) {
      batch.set(col.doc(doc.foodId), doc, { merge: true });
    }
    await batch.commit();
    written += chunk.length;
    console.log(`Wrote ${written}/${docs.length}`);
  }

  console.log("USDA nutrition catalog import complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
