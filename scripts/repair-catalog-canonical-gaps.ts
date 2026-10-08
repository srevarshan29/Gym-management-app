/**
 * Upsert missing canonical winners from local USDA JSON (no full re-import).
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/repair-catalog-canonical-gaps.ts --dry-run
 *   node --env-file=.env --import tsx scripts/repair-catalog-canonical-gaps.ts --prefix potato:sweet
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
} from "@/lib/nutrition/usda-catalog";

const DEFAULT_SOURCES = [
  {
    path: "./data/Foundation_Foods.json",
    dataset: "Foundation Foods",
  },
  {
    path: "./data/sr_legacy_extract/FoodData_Central_sr_legacy_food_json_2018-04.json",
    dataset: "SR Legacy",
  },
];

function parseArgs(argv: string[]) {
  let dryRun = false;
  let prefix = "potato:sweet";
  for (const token of argv) {
    if (token === "--dry-run") dryRun = true;
    if (token.startsWith("--prefix=")) {
      prefix = token.slice("--prefix=".length);
    }
  }
  return { dryRun, prefix };
}

function toFirestoreDoc(
  candidate: ParsedUsdaCatalogCandidate,
  dataset: string,
): NutritionFoodCatalogDoc {
  const now = Timestamp.now();
  const prefixes = new Set<string>();
  for (const label of [candidate.name, candidate.displayName]) {
    for (const p of buildCatalogSearchPrefixes(label)) {
      prefixes.add(p);
    }
  }

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
    searchPrefixes: [...prefixes].sort(),
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
  const { dryRun, prefix } = parseArgs(process.argv.slice(2));
  const sources = DEFAULT_SOURCES.map((source) => {
    const filePath = resolve(process.cwd(), source.path);
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    return {
      rows: loadUsdaFoodRowsFromJson(raw),
      dataset: source.dataset,
    };
  });

  const merged = mergeUsdaCatalogSources(sources);
  const targets = merged.winners.filter((winner) =>
    winner.candidate.canonicalKey.startsWith(prefix),
  );
  const sweetPotatoWinners = merged.winners.filter((winner) =>
    /sweet potato/i.test(winner.candidate.name),
  );
  console.log(
    `matched canonical winners for ${prefix}: ${targets.length}`,
    sweetPotatoWinners.map(
      (winner) =>
        `${winner.candidate.canonicalKey}:${winner.candidate.foodId}`,
    ),
  );

  const db = getFirestoreDb();
  const col = db.collection(COLLECTIONS.nutritionFoodCatalog);
  let written = 0;

  for (const winner of targets) {
    const doc = toFirestoreDoc(winner.candidate, winner.dataset);
    if (!dryRun) {
      await col.doc(doc.foodId).set(doc, { merge: true });
    }
    written += 1;
    console.log(`upsert ${doc.foodId} ${doc.displayName} (${doc.canonicalKey})`);
  }

  console.log(
    JSON.stringify({ prefix, upserted: written, dryRun }, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
