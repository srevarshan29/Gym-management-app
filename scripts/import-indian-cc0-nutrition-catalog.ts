/**
 * Import curated Indian CC0 foods into nutritionFoodCatalog (idempotent).
 *
 * Clone dataset locally (not committed):
 *   git clone https://github.com/prabhubng/indian-nutrition-data.git data/indian-nutrition-data
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/import-indian-cc0-nutrition-catalog.ts
 *   node --env-file=.env --import tsx scripts/import-indian-cc0-nutrition-catalog.ts --dry-run
 *   node --env-file=.env --import tsx scripts/import-indian-cc0-nutrition-catalog.ts --file ./data/indian-nutrition-data/foods.json
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
import { INDIAN_CC0_NUTRITION_ATTRIBUTION } from "@/lib/nutrition/indian-cc0-attribution";
import {
  loadIndianCc0FoodsFromJson,
  resolveIndianCc0ImportCandidates,
  southIndianPriorityImported,
  usdaCanonicalOverlapsForIndian,
  type ParsedIndianCc0Candidate,
} from "@/lib/nutrition/indian-cc0-catalog";

const DEFAULT_FILE = "./data/indian-nutrition-data/foods.json";

function parseArgs(argv: string[]) {
  let dryRun = false;
  let file = DEFAULT_FILE;
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") dryRun = true;
    if (token === "--file") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing path after --file");
      }
      file = value;
      i += 1;
    }
  }
  return { dryRun, file };
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
  candidate: ParsedIndianCc0Candidate,
  createdAt: Timestamp,
): NutritionFoodCatalogDoc {
  const now = Timestamp.now();
  return omitUndefined({
    foodId: candidate.foodId,
    source: "indian_cc0",
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
      dataset: INDIAN_CC0_NUTRITION_ATTRIBUTION.dataset,
      version: null,
      url: INDIAN_CC0_NUTRITION_ATTRIBUTION.url,
      license: INDIAN_CC0_NUTRITION_ATTRIBUTION.license,
    },
    isActive: true,
    createdAt,
    updatedAt: now,
  });
}

async function main() {
  const { dryRun, file } = parseArgs(process.argv.slice(2));
  const filePath = resolve(process.cwd(), file);
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  const foods = loadIndianCc0FoodsFromJson(raw);
  console.log(`Loaded ${foods.length} CC0 foods from ${filePath}`);

  const resolved = resolveIndianCc0ImportCandidates(foods);
  const priority = southIndianPriorityImported(resolved.candidates);

  const db = getFirestoreDb();
  const col = db.collection(COLLECTIONS.nutritionFoodCatalog);

  let imported = 0;
  let updated = 0;
  let usdaAlreadyPresent = 0;

  for (const candidate of resolved.candidates) {
    const overlaps = usdaCanonicalOverlapsForIndian(candidate.canonicalKey);
    for (const usdaKey of overlaps) {
      const snap = await col
        .where("isActive", "==", true)
        .where("canonicalKey", "==", usdaKey)
        .limit(3)
        .get();
      if (snap.docs.some((d) => d.data().source === "USDA")) {
        usdaAlreadyPresent += 1;
        break;
      }
    }
  }

  if (!dryRun) {
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
  } else {
    imported = resolved.candidates.length;
  }

  const report = {
    imported,
    updated,
    duplicatesSkipped: resolved.duplicatesSkipped,
    invalid: resolved.invalid,
    missingUnsupported: resolved.missingTargets,
    usdaAlreadyPresent,
    southIndianPriorityFound: priority.found,
    southIndianDishesMissingFromDataset: priority.missing,
    candidateCount: resolved.candidates.length,
    dryRun,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
