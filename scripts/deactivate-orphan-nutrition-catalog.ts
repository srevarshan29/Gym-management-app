/**
 * Deactivate nutritionFoodCatalog docs that are not current canonical import winners.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/deactivate-orphan-nutrition-catalog.ts
 *   node --env-file=.env --import tsx scripts/deactivate-orphan-nutrition-catalog.ts --dry-run
 *
 * Options:
 *   --file <path>       USDA JSON (repeat; use --dataset before each file)
 *   --dataset <name>    Dataset label for the next --file
 *   --dry-run           Report only, no writes
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Timestamp } from "firebase-admin/firestore";

import { getFirestoreDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { NutritionFoodCatalogDoc } from "@/lib/firestore/types";
import {
  canonicalWinnerFoodIds,
  loadUsdaFoodRowsFromJson,
  type UsdaCatalogSourceInput,
} from "@/lib/nutrition/usda-catalog";

const DEFAULT_SOURCES: { path: string; dataset: string }[] = [
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
  const files: { path: string; dataset: string }[] = [];
  let dryRun = false;
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
    }
  }

  return { files: files.length > 0 ? files : DEFAULT_SOURCES, dryRun };
}

function loadSources(
  fileSpecs: { path: string; dataset: string }[],
): UsdaCatalogSourceInput[] {
  return fileSpecs.map((file) => {
    const filePath = resolve(process.cwd(), file.path);
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    const rows = loadUsdaFoodRowsFromJson(raw);
    console.log(`Loaded ${rows.length} rows from ${filePath} (${file.dataset})`);
    return { rows, dataset: file.dataset };
  });
}

async function main() {
  const { files, dryRun } = parseArgs(process.argv.slice(2));
  const sources = loadSources(files);
  const winnerFoodIds = canonicalWinnerFoodIds(sources);

  console.log(`Canonical winners: ${winnerFoodIds.size} foodIds`);

  const db = getFirestoreDb();
  const col = db.collection(COLLECTIONS.nutritionFoodCatalog);
  const snap = await col.get();

  const toDeactivate: string[] = [];

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as NutritionFoodCatalogDoc;
    if (!data.isActive) continue;
    if (data.source !== "USDA") continue;

    const foodId = data.foodId ?? docSnap.id;
    if (winnerFoodIds.has(foodId)) continue;

    toDeactivate.push(foodId);
  }

  console.log(
    JSON.stringify(
      {
        catalogDocsTotal: snap.size,
        canonicalWinners: winnerFoodIds.size,
        orphansToDeactivate: toDeactivate.length,
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

  const BATCH = 400;
  let deactivated = 0;
  const now = Timestamp.now();

  for (let i = 0; i < toDeactivate.length; i += BATCH) {
    const batch = db.batch();
    const chunk = toDeactivate.slice(i, i + BATCH);
    for (const docId of chunk) {
      if (winnerFoodIds.has(docId)) {
        throw new Error(`Refusing to deactivate canonical winner ${docId}`);
      }
      batch.update(col.doc(docId), { isActive: false, updatedAt: now });
    }
    await batch.commit();
    deactivated += chunk.length;
    console.log(`Deactivated ${deactivated}/${toDeactivate.length}`);
  }

  console.log(`Orphan nutrition catalog cleanup complete. Deactivated: ${deactivated}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
