/**
 * Controlled backfill: link seeded "Barbell Row" gym exercises to catalogId barbell-row.
 *
 * Updates at most 2 known production documents. Idempotent when already linked.
 *
 * Usage:
 *   BARBELL_ROW_BACKFILL_ALLOW_PRODUCTION=true node --env-file=.env --import tsx scripts/backfill-barbell-row-catalog-link.ts --confirm
 *
 * Refuses the Firestore emulator and refuses unless exactly 2 seeded matches exist.
 */
import { Timestamp } from "firebase-admin/firestore";

import { getFirestoreDb, isFirestoreEmulator } from "../src/lib/firebase/admin";
import { COLLECTIONS } from "../src/lib/firestore/collections";
import { platformContext, getRepositories } from "../src/lib/firestore";
import type { CustomExerciseDoc } from "../src/lib/firestore/types";

const BARBELL_NAME_LOWER = "barbell row";
const TARGET_CATALOG_ID = "barbell-row";
const TARGET_CATALOG_VERSION = "repdb-free-v1";
const EXPECTED_MATCH_COUNT = 2;

function fail(message: string): never {
  console.error(`ABORT: ${message}`);
  process.exit(2);
}

function parseConfirm(argv: string[]): boolean {
  return argv.includes("--confirm");
}

function hasCatalogId(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

async function findSeededBarbellRows() {
  const db = getFirestoreDb();
  const snap = await db
    .collection(COLLECTIONS.customExercises)
    .where("nameLower", "==", BARBELL_NAME_LOWER)
    .where("isSeeded", "==", true)
    .get();

  return snap.docs.map((doc) => ({
    exerciseId: doc.id,
    ...(doc.data() as CustomExerciseDoc),
  }));
}

async function main() {
  if (!parseConfirm(process.argv.slice(2))) {
    fail('Re-run with --confirm after reviewing targets.');
  }

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    fail(
      `FIRESTORE_EMULATOR_HOST is set (${process.env.FIRESTORE_EMULATOR_HOST}). Unset for production backfill.`,
    );
  }

  if (isFirestoreEmulator()) {
    fail("Admin SDK is in emulator mode.");
  }

  if (process.env.BARBELL_ROW_BACKFILL_ALLOW_PRODUCTION !== "true") {
    fail(
      "Set BARBELL_ROW_BACKFILL_ALLOW_PRODUCTION=true to run this production backfill.",
    );
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? "(unknown)";
  console.log("Barbell Row catalog link backfill");
  console.log("================================");
  console.log(`Firebase project: ${projectId}`);
  console.log(`Target catalogId: ${TARGET_CATALOG_ID}`);
  console.log(`Target catalog version: ${TARGET_CATALOG_VERSION}\n`);

  const matches = await findSeededBarbellRows();
  if (matches.length !== EXPECTED_MATCH_COUNT) {
    fail(
      `Expected exactly ${EXPECTED_MATCH_COUNT} seeded documents with nameLower "${BARBELL_NAME_LOWER}", found ${matches.length}.`,
    );
  }

  const needsBackfill = matches.filter((row) => !hasCatalogId(row.catalogId));
  const alreadyLinked = matches.filter(
    (row) => row.catalogId?.trim() === TARGET_CATALOG_ID,
  );
  const otherCatalog = matches.filter(
    (row) =>
      hasCatalogId(row.catalogId) &&
      row.catalogId!.trim() !== TARGET_CATALOG_ID,
  );

  if (otherCatalog.length > 0) {
    fail(
      `Unexpected catalogId on seeded Barbell Row doc(s): ${otherCatalog.map((r) => `${r.gymId}/${r.exerciseId}=${r.catalogId}`).join(", ")}`,
    );
  }

  if (needsBackfill.length === 0) {
    if (alreadyLinked.length === EXPECTED_MATCH_COUNT) {
      console.log("Idempotent: both documents already linked to barbell-row.");
      for (const row of alreadyLinked) {
        console.log(
          `  gymId=${row.gymId} exerciseId=${row.exerciseId} catalogId=${row.catalogId} importedCatalogVersion=${row.importedCatalogVersion ?? "(null)"}`,
        );
      }
      process.exit(0);
    }
    fail("No documents need backfill but not all are linked to barbell-row.");
  }

  if (needsBackfill.length !== EXPECTED_MATCH_COUNT) {
    fail(
      `Expected exactly ${EXPECTED_MATCH_COUNT} documents without catalogId, found ${needsBackfill.length} (${alreadyLinked.length} already linked).`,
    );
  }

  console.log("Targets (pre-write):");
  for (const row of needsBackfill) {
    console.log(
      `  gymId=${row.gymId} exerciseId=${row.exerciseId} name="${row.name}" nameLower="${row.nameLower}"`,
    );
  }
  console.log("");

  const { customExercises, exerciseCatalog } = getRepositories();
  const catalog = await exerciseCatalog.getByCatalogId(
    platformContext,
    TARGET_CATALOG_ID,
  );
  if (!catalog?.isActive) {
    fail(`Platform catalog exercise "${TARGET_CATALOG_ID}" is missing or inactive.`);
  }

  const enrichedAt = Timestamp.now();
  for (const row of needsBackfill) {
    await customExercises.update(platformContext, row.gymId, row.exerciseId, {
      catalogId: TARGET_CATALOG_ID,
      importedCatalogVersion: TARGET_CATALOG_VERSION,
      enrichedAt,
    });
  }

  console.log("Post-write verification:");
  for (const row of needsBackfill) {
    const updated = await customExercises.getById(
      platformContext,
      row.gymId,
      row.exerciseId,
    );
    if (!updated) {
      fail(`Document missing after update: ${row.gymId}/${row.exerciseId}`);
    }
    if (updated.catalogId !== TARGET_CATALOG_ID) {
      fail(
        `catalogId mismatch for ${row.exerciseId}: ${updated.catalogId ?? "(null)"}`,
      );
    }
    if (updated.importedCatalogVersion !== TARGET_CATALOG_VERSION) {
      fail(
        `importedCatalogVersion mismatch for ${row.exerciseId}: ${updated.importedCatalogVersion ?? "(null)"}`,
      );
    }
    if (updated.name !== row.name || updated.nameLower !== row.nameLower) {
      fail(`Name fields changed for ${row.exerciseId} — backfill must not rename.`);
    }
    if (updated.gymId !== row.gymId) {
      fail(`gymId changed for ${row.exerciseId}.`);
    }
    console.log(
      `  OK gymId=${updated.gymId} exerciseId=${updated.id} catalogId=${updated.catalogId} importedCatalogVersion=${updated.importedCatalogVersion}`,
    );
  }

  console.log("\nBackfill complete (2 documents updated).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
