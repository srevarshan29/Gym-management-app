/**
 * Applies approved muscle groups and browse tags to data/catalog/exercises.json.
 * Does not touch Firestore.
 */
import { readFileSync, writeFileSync } from "node:fs";

import { applyApprovedCatalogClassification } from "../src/lib/catalog/catalog-classification";
import { sha256Hex } from "../src/lib/catalog/hash";
import {
  CATALOG_EXERCISES_PATH,
  CATALOG_MANIFEST_PATH,
} from "../src/lib/catalog/paths";
import type { CatalogExerciseInput } from "../src/lib/catalog/types";

function main() {
  const raw = JSON.parse(
    readFileSync(CATALOG_EXERCISES_PATH, "utf8"),
  ) as CatalogExerciseInput[];

  if (!Array.isArray(raw) || raw.length !== 601) {
    console.error(`Expected 601 exercises, got ${raw?.length ?? 0}`);
    process.exit(1);
  }

  const rows = raw.map((row) => applyApprovedCatalogClassification(row));
  rows.sort((a, b) => a.catalogId.localeCompare(b.catalogId));

  const exercisesJson = `${JSON.stringify(rows, null, 2)}\n`;
  writeFileSync(CATALOG_EXERCISES_PATH, exercisesJson, "utf8");

  const manifest = JSON.parse(readFileSync(CATALOG_MANIFEST_PATH, "utf8")) as {
    catalogVersion: string;
    provider: string;
    exerciseCount: number;
    sha256OfJson: string;
    syncedAt: string | null;
  };
  manifest.exerciseCount = rows.length;
  manifest.sha256OfJson = sha256Hex(exercisesJson);
  writeFileSync(
    CATALOG_MANIFEST_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(`Updated ${rows.length} exercises; manifest SHA-256: ${manifest.sha256OfJson}`);
}

main();
