/**
 * Import Indian Nutrient Databank (INDB) into nutritionFoodCatalog (idempotent).
 *
 * Clone dataset locally (gitignored):
 *   git clone https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-.git data/indian-nutrient-databank
 *
 * Usage:
 *   npm run db:import:indb-nutrition
 *   npm run db:import:indb-nutrition -- --dry-run
 *   node --env-file=.env --import tsx scripts/import-indb-nutrition-catalog.ts --dir ./data/indian-nutrient-databank
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Timestamp } from "firebase-admin/firestore";
import * as XLSX from "xlsx";

import {
  buildCatalogSearchPrefixes,
  normalizeCatalogName,
} from "@/lib/exercises/catalog-search";
import { getFirestoreDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { omitUndefined } from "@/lib/firestore/serialize";
import type {
  NutritionFoodCatalogDoc,
  NutritionIndbCatalogMetadata,
} from "@/lib/firestore/types";
import { INDB_NUTRITION_ATTRIBUTION } from "@/lib/nutrition/indb-attribution";
import {
  resolveIndbImportCandidates,
  type ParsedIndbCandidate,
} from "@/lib/nutrition/indb-catalog";

const DEFAULT_DIR = "./data/indian-nutrient-databank";

function parseArgs(argv: string[]) {
  let dryRun = false;
  let dir = DEFAULT_DIR;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") dryRun = true;
    if (token === "--dir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing path after --dir");
      }
      dir = value;
      i += 1;
    }
  }
  return { dryRun, dir };
}

function readSheetRows(
  filePath: string,
  preferredSheet?: string,
): Record<string, unknown>[] {
  const workbook = XLSX.read(readFileSync(filePath));
  const sheetName =
    (preferredSheet && workbook.SheetNames.includes(preferredSheet)
      ? preferredSheet
      : workbook.SheetNames[0]) ?? null;
  if (!sheetName) {
    throw new Error(`No sheets in ${filePath}`);
  }
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: null,
  }) as Record<string, unknown>[];
}

function loadIndbDataset(dir: string) {
  const base = resolve(process.cwd(), dir);
  const recipes = readSheetRows(resolve(base, "INDB.xlsx"), "Nutrient Data");
  const ukIngredients = readSheetRows(resolve(base, "UK_fct.xlsx"));
  const usIngredients = readSheetRows(resolve(base, "US_fct.xlsx"));
  const recipeIngredients = readSheetRows(resolve(base, "recipes.xlsx"));
  const servings = readSheetRows(resolve(base, "recipes_servingsize.xlsx"));
  return { recipes, ukIngredients, usIngredients, recipeIngredients, servings };
}

function buildFoodSearchPrefixes(
  name: string,
  displayName: string,
  aliases: string[],
): string[] {
  const prefixes = new Set<string>();
  for (const label of [name, displayName, ...aliases]) {
    for (const prefix of buildCatalogSearchPrefixes(label)) {
      prefixes.add(prefix);
    }
  }
  return [...prefixes].sort();
}

function toIndbMetadata(
  candidate: ParsedIndbCandidate,
): NutritionIndbCatalogMetadata {
  return {
    foodCode: candidate.indb.foodCode,
    foodCodeOrg: candidate.indb.foodCodeOrg,
    primarysource: candidate.indb.primarysource,
    recordType: candidate.indb.recordType,
    recipeNameOrg: candidate.indb.recipeNameOrg,
    ingredientSource: candidate.indb.ingredientSource,
    retentionFactor: candidate.indb.retentionFactor,
    nutrients: candidate.indb.nutrients,
    serving: candidate.indb.serving,
    ingredients: candidate.indb.ingredients,
  };
}

function toFirestoreDoc(
  candidate: ParsedIndbCandidate,
  createdAt: Timestamp,
): NutritionFoodCatalogDoc {
  const now = Timestamp.now();
  return omitUndefined({
    foodId: candidate.foodId,
    source: "indb",
    sourceFoodId: candidate.sourceFoodId,
    name: candidate.name,
    nameLower: normalizeCatalogName(candidate.name),
    canonicalKey: candidate.canonicalKey,
    displayName: candidate.displayName,
    searchBoost: candidate.searchBoost,
    category: candidate.category,
    caloriesPer100g: candidate.caloriesPer100g,
    proteinPer100g: candidate.proteinPer100g,
    carbsPer100g: candidate.carbsPer100g,
    fatPer100g: candidate.fatPer100g,
    fiberPer100g: candidate.fiberPer100g,
    servingSizeGrams: candidate.servingSizeGrams,
    servingSizeLabel: candidate.servingSizeLabel,
    aliases: candidate.aliases,
    searchPrefixes: buildFoodSearchPrefixes(
      candidate.name,
      candidate.displayName,
      candidate.aliases,
    ),
    sourceAttribution: {
      dataset: INDB_NUTRITION_ATTRIBUTION.dataset,
      version: INDB_NUTRITION_ATTRIBUTION.version,
      url: INDB_NUTRITION_ATTRIBUTION.url,
      license: INDB_NUTRITION_ATTRIBUTION.license,
    },
    indbMetadata: toIndbMetadata(candidate),
    isActive: true,
    createdAt,
    updatedAt: now,
  });
}

async function main() {
  const { dryRun, dir } = parseArgs(process.argv.slice(2));
  const dataset = loadIndbDataset(dir);
  const resolved = resolveIndbImportCandidates(dataset);

  console.log(
    JSON.stringify(
      {
        dryRun,
        dataDir: resolve(process.cwd(), dir),
        loaded: {
          recipes: dataset.recipes.length,
          ukIngredients: dataset.ukIngredients.length,
          usIngredients: dataset.usIngredients.length,
          recipeIngredientRows: dataset.recipeIngredients.length,
          servingRows: dataset.servings.length,
        },
        candidateCount: resolved.candidates.length,
        invalid: resolved.invalid,
        duplicateFoodCodes: resolved.duplicateFoodCodes,
        countsByRecordType: resolved.countsByRecordType,
        countsByPrimarySource: resolved.countsByPrimarySource,
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    return;
  }

  const db = getFirestoreDb();
  const col = db.collection(COLLECTIONS.nutritionFoodCatalog);

  let imported = 0;
  let updated = 0;

  for (const candidate of resolved.candidates) {
    const ref = col.doc(candidate.foodId);
    const existing = await ref.get();
    const createdAt =
      existing.exists && existing.data()?.createdAt
        ? (existing.data()!.createdAt as Timestamp)
        : Timestamp.now();
    const doc = toFirestoreDoc(candidate, createdAt);
    await ref.set(doc, { merge: true });
    if (existing.exists) {
      updated += 1;
    } else {
      imported += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        imported,
        updated,
        total: resolved.candidates.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
