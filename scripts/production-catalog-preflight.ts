/**
 * Read-only production preflight for RepDB catalog sync (Phase 3A).
 *
 * DO NOT write Firestore or Supabase. Refuses emulator host.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/production-catalog-preflight.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { loadCatalogBundleFiles, validateCatalogBundle } from "../src/lib/catalog/bundle-validation";
import { CATALOG_IMAGES_DIR, CATALOG_SYNC_META_DOC_ID } from "../src/lib/catalog/paths";
import { catalogMediaStoragePath } from "../src/lib/exercises/media-paths";
import { getFirestoreDb, isFirestoreEmulator } from "../src/lib/firebase/admin";
import { COLLECTIONS } from "../src/lib/firestore/collections";
import { validateSupabaseStorageConfig } from "../src/lib/storage/supabase-config";
import type { CustomExerciseDoc, ExerciseCatalogDoc } from "../src/lib/firestore/types";

const EXPECTED_VERSION = "repdb-free-v1";
const BARBELL_NAME_LOWER = "barbell row";

function fail(message: string): never {
  console.error(`ABORT: ${message}`);
  process.exit(2);
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

function measureLocalCatalogImages(): { fileCount: number; totalBytes: number } {
  let fileCount = 0;
  let totalBytes = 0;
  for (const catalogId of readdirSync(CATALOG_IMAGES_DIR)) {
    const dir = join(CATALOG_IMAGES_DIR, catalogId);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    for (const file of readdirSync(dir)) {
      const path = join(dir, file);
      const st = statSync(path);
      if (st.isFile()) {
        fileCount += 1;
        totalBytes += st.size;
      }
    }
  }
  return { fileCount, totalBytes };
}

async function listStoragePrefix(
  bucket: string,
  client: SupabaseClient,
  prefix: string,
): Promise<{ names: string[]; truncated: boolean }> {
  const names: string[] = [];
  let offset = 0;
  const limit = 1000;
  let truncated = false;

  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      throw new Error(`Supabase list ${prefix}: ${error.message}`);
    }
    const entries = data ?? [];
    for (const entry of entries) {
      if (entry.name) {
        names.push(prefix ? `${prefix}/${entry.name}` : entry.name);
      }
    }
    if (entries.length < limit) break;
    offset += limit;
    if (offset > 50_000) {
      truncated = true;
      break;
    }
  }
  return { names, truncated };
}

async function objectExists(
  bucket: string,
  client: SupabaseClient,
  objectPath: string,
): Promise<boolean> {
  const folder = objectPath.includes("/")
    ? objectPath.slice(0, objectPath.lastIndexOf("/"))
    : "";
  const name = objectPath.slice(folder.length + 1);
  const { data, error } = await client.storage.from(bucket).list(folder, {
    search: name,
    limit: 10,
  });
  if (error) return false;
  return (data ?? []).some((entry) => entry.name === name);
}

async function inspectFirestore() {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    fail(
      `FIRESTORE_EMULATOR_HOST is set (${process.env.FIRESTORE_EMULATOR_HOST}). Unset for production preflight.`,
    );
  }
  if (isFirestoreEmulator()) {
    fail("Admin SDK reports emulator mode.");
  }

  const db = getFirestoreDb();
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "(unknown)";

  const catalogSnap = await db.collection(COLLECTIONS.exerciseCatalog).get();
  const activeCount = catalogSnap.docs.filter(
    (doc) => (doc.data() as ExerciseCatalogDoc).isActive !== false,
  ).length;
  const repdbVersionDocs = catalogSnap.docs.filter(
    (doc) => (doc.data() as ExerciseCatalogDoc).catalogVersion === EXPECTED_VERSION,
  );

  const metaSnap = await db
    .collection(COLLECTIONS.catalogSyncMeta)
    .doc(CATALOG_SYNC_META_DOC_ID)
    .get();

  const barbellQuery = await db
    .collection(COLLECTIONS.customExercises)
    .where("nameLower", "==", BARBELL_NAME_LOWER)
    .where("isSeeded", "==", true)
    .get();

  const barbellRows = barbellQuery.docs
    .map((doc) => {
      const data = doc.data() as CustomExerciseDoc;
      const catalogId = data.catalogId?.trim() || null;
      return {
        exerciseId: doc.id,
        gymId: data.gymId,
        name: data.name,
        catalogId,
        isSeeded: data.isSeeded,
      };
    })
    .filter((row) => !row.catalogId);

  return {
    projectId,
    catalogTotal: catalogSnap.size,
    catalogActive: activeCount,
    repdbVersionCount: repdbVersionDocs.length,
    metaExists: metaSnap.exists,
    meta: metaSnap.exists ? metaSnap.data() : null,
    barbellCandidates: barbellRows,
  };
}

async function inspectSupabase() {
  const validated = validateSupabaseStorageConfig();
  if (!validated.ok) {
    return { ok: false as const, error: validated.error };
  }

  const { config } = validated;
  const client = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false },
  });

  const catalogRoot = await listStoragePrefix(config.bucket, client, "catalog");
  const barbellPaths = ["primary", "secondary", "thumbnail"] as const;
  const barbellObjects: Record<string, boolean> = {};
  for (const pose of barbellPaths) {
    const objectPath = `${catalogMediaStoragePath("barbell-row", pose)}.webp`;
    barbellObjects[objectPath] = await objectExists(config.bucket, client, objectPath);
  }

  let catalogFolderCount = 0;
  const { data: topLevel, error } = await client.storage.from(config.bucket).list("catalog", {
    limit: 1000,
  });
  if (!error && topLevel) {
    catalogFolderCount = topLevel.filter((e) => e.id === null || e.metadata == null).length;
    // Supabase list: folders have id null in some API versions; count entries
    catalogFolderCount = topLevel.length;
  }

  return {
    ok: true as const,
    host: config.host,
    bucket: config.bucket,
    catalogPrefixEntries: catalogRoot.names.length,
    catalogListTruncated: catalogRoot.truncated,
    catalogTopLevelCount: catalogFolderCount,
    barbellObjects,
    sampleUploadPaths: barbellPaths.map(
      (pose) => `${catalogMediaStoragePath("barbell-row", pose)}.webp`,
    ),
  };
}

async function main() {
  console.log("Production catalog preflight (read-only)");
  console.log("========================================\n");

  const bundle = loadCatalogBundleFiles();
  const bundleOk = validateCatalogBundle(bundle);
  if (!bundleOk.ok) {
    fail(`Local bundle invalid: ${bundleOk.errors.join("; ")}`);
  }
  console.log(
    `Local bundle: ${bundleOk.manifest.exerciseCount} exercises, version=${bundleOk.manifest.catalogVersion}, sha256=${bundleOk.manifest.sha256OfJson}`,
  );

  const localMedia = measureLocalCatalogImages();
  console.log(
    `Local images: ${localMedia.fileCount} files, ${formatBytes(localMedia.totalBytes)} total\n`,
  );

  const firestore = await inspectFirestore();
  console.log("--- Firestore (production read) ---");
  console.log(`Project: ${firestore.projectId}`);
  console.log(`exerciseCatalog documents: ${firestore.catalogTotal} (active: ${firestore.catalogActive})`);
  console.log(`Documents with catalogVersion=${EXPECTED_VERSION}: ${firestore.repdbVersionCount}`);
  console.log(`catalogSyncMeta/active exists: ${firestore.metaExists}`);
  if (firestore.metaExists) {
    console.log(`catalogSyncMeta/active: ${JSON.stringify(firestore.meta, null, 2)}`);
  } else {
    console.log("catalogSyncMeta/active: (missing)");
  }
  console.log(
    `\nSeeded Barbell Row without catalogId: ${firestore.barbellCandidates.length} document(s)`,
  );
  for (const row of firestore.barbellCandidates) {
    console.log(
      `  gymId=${row.gymId} exerciseId=${row.exerciseId} name="${row.name}"`,
    );
  }

  console.log("\n--- Supabase storage (read-only list) ---");
  try {
    const supabase = await inspectSupabase();
    if (!supabase.ok) {
      console.log(`Supabase config: NOT READY — ${supabase.error}`);
    } else {
      console.log(`Host: ${supabase.host}`);
      console.log(`Bucket: ${supabase.bucket}`);
      console.log(`catalog/ prefix list entries (flat): ${supabase.catalogPrefixEntries}`);
      if (supabase.catalogListTruncated) {
        console.log("(catalog listing truncated — bucket may have many objects)");
      }
      console.log(`catalog/ top-level list count: ${supabase.catalogTopLevelCount}`);
      console.log("Expected upload object path pattern: catalog/{catalogId}/{primary|secondary|thumbnail}.webp");
      console.log("barbell-row object probe (Storage API list/search):");
      for (const [path, exists] of Object.entries(supabase.barbellObjects)) {
        console.log(`  ${path}: ${exists ? "EXISTS" : "not found"}`);
      }
    }
  } catch (error) {
    console.log(`Supabase Storage API list failed: ${error instanceof Error ? error.message : error}`);
    const validated = validateSupabaseStorageConfig();
    if (validated.ok) {
      console.log(`Host: ${validated.config.host}`);
      console.log(`Bucket: ${validated.config.bucket}`);
      console.log("Falling back to public URL HEAD probes (read-only):");
      for (const pose of ["primary", "secondary", "thumbnail"] as const) {
        const objectPath = `${catalogMediaStoragePath("barbell-row", pose)}.webp`;
        const publicUrl = `https://${validated.config.host}/storage/v1/object/public/${validated.config.bucket}/${objectPath}`;
        try {
          const response = await fetch(publicUrl, { method: "HEAD" });
          console.log(`  ${objectPath}: HTTP ${response.status}`);
        } catch (probeError) {
          console.log(
            `  ${objectPath}: probe failed (${probeError instanceof Error ? probeError.message : probeError})`,
          );
        }
      }
    }
  }

  console.log("\n--- Production sync command (DO NOT RUN) ---");
  console.log(
    "CATALOG_SYNC_ALLOW_PRODUCTION=true node --env-file=.env --import tsx scripts/catalog-sync.ts --write --confirm-write --upload-media",
  );

  console.log("\nPreflight complete (no writes performed).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
