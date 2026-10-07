/**
 * Import USDA FoodData Central JSON into Firestore nutritionFoodCatalog.
 *
 * Download datasets from https://fdc.nal.usda.gov/download-datasets.html
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/import-usda-nutrition-catalog.ts \
 *     --file ./data/Foundation_Foods.json --file ./data/sr_legacy_extract/FoodData_Central_sr_legacy_food_json_2018-04.json
 *
 * Options:
 *   --file <path>     JSON file (repeat for multiple sources)
 *   --dataset <name>  Dataset label for the most recent --file (default Foundation Foods)
 *   --max <n>         Max unique canonical foods to write (default unlimited)
 *   --dry-run         Parse and dedupe only, no writes
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Timestamp } from "firebase-admin/firestore";

import {
  buildCatalogSearchPrefixes,
  normalizeCatalogName,
} from "@/lib/exercises/catalog-search";
import { getFirestoreDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { omitUndefined } from "@/lib/firestore/serialize";
import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import { USDA_FOODDATA_CENTRAL_ATTRIBUTION } from "@/lib/nutrition/attribution";
import {
  loadUsdaFoodRowsFromJson,
  mergeUsdaCatalogSources,
  type ParsedUsdaCatalogCandidate,
  usdaImportQualityScore,
} from "@/lib/nutrition/usda-catalog";

type FileSource = { path: string; dataset: string };

function parseArgs(argv: string[]) {
  const files: FileSource[] = [];
  let dryRun = false;
  let max: number | null = null;
  let pendingDataset = "Foundation Foods";

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token === "--file") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing path after --file");
      }
      files.push({ path: value, dataset: pendingDataset });
      i += 1;
      continue;
    }
    if (token === "--dataset") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value after --dataset");
      }
      pendingDataset = value;
      i += 1;
      continue;
    }
    if (token === "--max") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value after --max");
      }
      max = Number(value);
      i += 1;
    }
  }

  return { files, dryRun, max };
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

function toFirestoreDoc(
  candidate: ParsedUsdaCatalogCandidate,
  dataset: string,
): NutritionFoodCatalogDoc {
  const now = Timestamp.now();
  return omitUndefined({
    foodId: candidate.foodId,
    source: "USDA",
    sourceFoodId: String(candidate.fdcId),
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
    aliases: [],
    searchPrefixes: buildFoodSearchPrefixes(
      candidate.name,
      candidate.displayName,
      [],
    ),
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
  const { files, dryRun, max } = parseArgs(process.argv.slice(2));
  if (files.length === 0) {
    console.error("Missing --file <path> (repeat for multiple files)");
    process.exit(1);
  }

  const sources = files.map((file) => {
    const filePath = resolve(process.cwd(), file.path);
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    const rows = loadUsdaFoodRowsFromJson(raw);
    console.log(`Loaded ${rows.length} rows from ${filePath} (${file.dataset})`);
    return { rows, dataset: file.dataset };
  });

  const merged = mergeUsdaCatalogSources(sources);
  let winnerRows = merged.winners.sort(
    (a, b) =>
      usdaImportQualityScore(b.candidate) - usdaImportQualityScore(a.candidate),
  );

  if (max != null && max > 0 && winnerRows.length > max) {
    winnerRows = winnerRows.slice(0, max);
  }

  const docs = winnerRows.map((w) => toFirestoreDoc(w.candidate, w.dataset));

  console.log(
    JSON.stringify(
      {
        uniqueFoods: docs.length,
        duplicatesSkipped: merged.duplicatesSkipped,
        lowValueSkipped: merged.lowValueSkipped,
        invalidSkipped: merged.invalidSkipped,
        dryRun,
      },
      null,
      2,
    ),
  );

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
