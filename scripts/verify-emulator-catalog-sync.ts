/**
 * Post-sync checks for catalog data written to the Firestore emulator only.
 *
 * Usage (emulator must be running or use firebase emulators:exec):
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node --env-file=.env --import tsx scripts/verify-emulator-catalog-sync.ts
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  loadCatalogBundleFiles,
  validateCatalogBundle,
} from "../src/lib/catalog/bundle-validation";
import { CATALOG_IMAGES_DIR, CATALOG_SYNC_META_DOC_ID } from "../src/lib/catalog/paths";
import { validateCatalogSyncMetaDoc } from "../src/lib/catalog/sync-meta-validation";
import { getFirestoreDb, isFirestoreEmulator } from "../src/lib/firebase/admin";
import { COLLECTIONS } from "../src/lib/firestore/collections";
import { platformContext, getRepositories } from "../src/lib/firestore";
import type { DocWithId } from "../src/lib/firestore/repositories/base";
import type { CustomExerciseDoc, ExerciseCatalogDoc } from "../src/lib/firestore/types";
import { resolveGymExerciseMediaForRead } from "../src/lib/exercises/gym-exercise-media-read";
import { resolveDemonstrationImageUrl } from "../src/lib/exercises/media-validation";
import { seedExercisesForGym } from "../src/lib/exercises";

const EXPECTED_COUNT = 601;
const EXPECTED_VERSION = "repdb-free-v1";
const TEST_GYM_ID = "catalog-emulator-integration-gym";

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function ok(message: string): void {
  console.log(`OK: ${message}`);
}

async function main() {
  if (!isFirestoreEmulator()) {
    fail(
      "FIRESTORE_EMULATOR_HOST is not set. Refusing to verify non-emulator Firestore.",
    );
  }

  const bundle = loadCatalogBundleFiles();
  const bundleValidation = validateCatalogBundle(bundle);
  if (!bundleValidation.ok) {
    fail(`Bundled catalog invalid: ${bundleValidation.errors.join("; ")}`);
  }
  ok("Bundled catalog validates locally");

  const db = getFirestoreDb();
  const catalogSnap = await db.collection(COLLECTIONS.exerciseCatalog).get();
  if (catalogSnap.size !== EXPECTED_COUNT) {
    fail(
      `exerciseCatalog count ${catalogSnap.size}, expected ${EXPECTED_COUNT}`,
    );
  }
  ok(`exerciseCatalog contains ${catalogSnap.size} documents`);

  const catalogIds = new Set<string>();
  const nameLowers = new Set<string>();
  for (const doc of catalogSnap.docs) {
    const data = doc.data() as ExerciseCatalogDoc;
    if (doc.id !== data.catalogId) {
      fail(`Document id ${doc.id} != catalogId ${data.catalogId}`);
    }
    if (catalogIds.has(data.catalogId)) {
      fail(`Duplicate catalogId ${data.catalogId}`);
    }
    catalogIds.add(data.catalogId);
    if (nameLowers.has(data.nameLower)) {
      fail(`Duplicate nameLower ${data.nameLower}`);
    }
    nameLowers.add(data.nameLower);
  }
  ok("No duplicate catalog IDs or normalized names in Firestore");

  const metaSnap = await db
    .collection(COLLECTIONS.catalogSyncMeta)
    .doc(CATALOG_SYNC_META_DOC_ID)
    .get();
  if (!metaSnap.exists) {
    fail("catalogSyncMeta/active is missing");
  }
  const metaValidation = validateCatalogSyncMetaDoc(metaSnap.data());
  if (!metaValidation.ok) {
    fail(`catalogSyncMeta invalid: ${metaValidation.errors.join("; ")}`);
  }
  const meta = metaValidation.meta;
  if (meta.catalogVersion !== EXPECTED_VERSION) {
    fail(`catalogSyncMeta.catalogVersion ${meta.catalogVersion}`);
  }
  if (meta.exerciseCount !== EXPECTED_COUNT) {
    fail(`catalogSyncMeta.exerciseCount ${meta.exerciseCount}`);
  }
  if (
    meta.jsonSha256.toLowerCase() !==
    bundleValidation.manifest.sha256OfJson.toLowerCase()
  ) {
    fail("catalogSyncMeta.jsonSha256 does not match bundled manifest");
  }
  ok(
    `catalogSyncMeta/active: version=${meta.catalogVersion}, sha256 matches manifest, status=${meta.status}`,
  );

  const barbellSnap = await db
    .collection(COLLECTIONS.exerciseCatalog)
    .doc("barbell-row")
    .get();
  if (!barbellSnap.exists) {
    fail('exerciseCatalog/barbell-row missing');
  }
  const barbell = {
    id: barbellSnap.id,
    ...(barbellSnap.data() as ExerciseCatalogDoc),
  } satisfies DocWithId<ExerciseCatalogDoc>;

  if (barbell.name !== "Bent-Over Barbell Row") {
    fail(`barbell-row name is "${barbell.name}"`);
  }

  const poses = ["primary", "secondary", "thumbnail"] as const;
  for (const pose of poses) {
    const localPath = join(CATALOG_IMAGES_DIR, "barbell-row", `${pose}.webp`);
    if (!existsSync(localPath)) {
      fail(`Missing local asset ${localPath}`);
    }
    const urlKey =
      pose === "primary"
        ? "primaryImageUrl"
        : pose === "secondary"
          ? "secondaryImageUrl"
          : "thumbnailUrl";
    const url = barbell.media?.[urlKey];
    if (!url || !url.includes(`/catalog/barbell-row/${pose}.webp`)) {
      fail(`barbell-row Firestore media.${urlKey} does not resolve to ${pose}.webp`);
    }
  }
  ok("barbell-row catalog doc and local primary/secondary/thumbnail assets align");

  await seedExercisesForGym(TEST_GYM_ID);
  const { customExercises, exerciseCatalog } = getRepositories();
  const seeded = await customExercises.findByNameLower(
    platformContext,
    TEST_GYM_ID,
    "barbell row",
  );
  if (!seeded) {
    fail("Seeded Barbell Row not found in emulator gym");
  }
  ok(`Seeded gym exercise "${seeded.name}" (id=${seeded.id}, catalogId=${seeded.catalogId ?? "null"})`);

  const catalogById = await exerciseCatalog.getByCatalogId(
    platformContext,
    "barbell-row",
  );
  if (!catalogById) {
    fail("Could not load barbell-row from repository");
  }

  const mediaBeforeLink = resolveGymExerciseMediaForRead(
    seeded,
    new Map([[catalogById.catalogId, catalogById]]),
    new Map([[catalogById.nameLower, catalogById]]),
  );
  const demoBefore = resolveDemonstrationImageUrl(mediaBeforeLink);
  if (demoBefore) {
    ok(
      `Media before catalogId link: ${demoBefore} (name fallback would only work if nameLower matched)`,
    );
  } else {
    ok(
      "Media before catalogId link: empty (expected — seeded name \"barbell row\" ≠ catalog nameLower \"bent-over barbell row\")",
    );
  }

  await customExercises.update(platformContext, TEST_GYM_ID, seeded.id, {
    catalogId: "barbell-row",
    importedCatalogVersion: EXPECTED_VERSION,
  });
  const linked = await customExercises.getById(
    platformContext,
    TEST_GYM_ID,
    seeded.id,
  );
  if (!linked?.catalogId) {
    fail("Failed to set catalogId on seeded Barbell Row in emulator");
  }

  const mediaAfterLink = resolveGymExerciseMediaForRead(
    linked,
    new Map([[catalogById.catalogId, catalogById]]),
    new Map(),
  );
  const demoAfter = resolveDemonstrationImageUrl(mediaAfterLink);
  if (!demoAfter?.includes("/catalog/barbell-row/primary.webp")) {
    fail(`Linked media resolution failed: ${demoAfter ?? "(empty)"}`);
  }
  ok(
    `catalog → gym exercise → media: exerciseId=${linked.id} unchanged, demo URL=${demoAfter}`,
  );

  console.log("");
  console.log("Emulator catalog integration verification passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
