/**
 * Read-only Supabase Storage inventory for platform catalog media (Phase 3B).
 *
 * DO NOT upload, delete, or modify storage. No Firestore writes.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/supabase-catalog-storage-inventory.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { CATALOG_IMAGES_DIR } from "../src/lib/catalog/paths";
import { catalogMediaStoragePath } from "../src/lib/exercises/media-paths";
import { validateSupabaseStorageConfig } from "../src/lib/storage/supabase-config";

type ListedObject = {
  objectPath: string;
  size: number | null;
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function buildExpectedLocalObjectPaths(): Set<string> {
  const expected = new Set<string>();
  if (!existsSync(CATALOG_IMAGES_DIR)) return expected;

  for (const catalogId of readdirSync(CATALOG_IMAGES_DIR)) {
    const dir = join(CATALOG_IMAGES_DIR, catalogId);
    if (!statSync(dir).isDirectory()) continue;
    for (const filename of readdirSync(dir)) {
      const filePath = join(dir, filename);
      if (!statSync(filePath).isFile()) continue;
      expected.add(`catalog/${catalogId}/${filename}`);
    }
  }
  return expected;
}

async function listFolderPage(
  client: SupabaseClient,
  bucket: string,
  folderPath: string,
  offset: number,
  limit: number,
) {
  return client.storage.from(bucket).list(folderPath, {
    limit,
    offset,
    sortBy: { column: "name", order: "asc" },
  });
}

/**
 * Walks `catalog/` (and subfolders) using Storage list API only.
 */
async function inventoryCatalogPrefix(
  client: SupabaseClient,
  bucket: string,
): Promise<{ objects: ListedObject[]; catalogPrefixExists: boolean; listErrors: string[] }> {
  const objects: ListedObject[] = [];
  const listErrors: string[] = [];
  const pageSize = 1000;

  const root = await listFolderPage(client, bucket, "catalog", 0, pageSize);
  if (root.error) {
    throw new Error(
      `Storage list catalog/: ${root.error.message} (name=${root.error.name ?? "unknown"})`,
    );
  }

  const rootEntries = root.data ?? [];
  if (rootEntries.length === 0) {
    return { objects, catalogPrefixExists: false, listErrors };
  }

  const catalogPrefixExists = true;
  const subfolders: string[] = [];
  const rootFiles: string[] = [];

  for (const entry of rootEntries) {
    if (!entry.name) continue;
    const meta = entry.metadata as { size?: number } | null;
    if (meta && typeof meta.size === "number") {
      rootFiles.push(entry.name);
      objects.push({
        objectPath: `catalog/${entry.name}`,
        size: meta.size,
      });
    } else {
      subfolders.push(entry.name);
    }
  }

  for (const name of rootFiles) {
    // already recorded
    void name;
  }

  for (const catalogId of subfolders) {
    const prefix = `catalog/${catalogId}`;
    let offset = 0;
    for (;;) {
      const page = await listFolderPage(client, bucket, prefix, offset, pageSize);
      if (page.error) {
        listErrors.push(`${prefix}: ${page.error.message}`);
        break;
      }
      const entries = page.data ?? [];
      if (entries.length === 0 && offset === 0) {
        break;
      }
      for (const entry of entries) {
        if (!entry.name) continue;
        const meta = entry.metadata as { size?: number } | null;
        const size = meta && typeof meta.size === "number" ? meta.size : null;
        if (size != null) {
          objects.push({
            objectPath: `${prefix}/${entry.name}`,
            size,
          });
        } else {
          listErrors.push(`${prefix}/${entry.name}: nested folder or missing metadata (skipped)`);
        }
      }
      if (entries.length < pageSize) break;
      offset += pageSize;
    }
  }

  return { objects, catalogPrefixExists, listErrors };
}

async function main() {
  console.log("Supabase catalog storage inventory (read-only)");
  console.log("============================================\n");

  const validated = validateSupabaseStorageConfig();
  if (!validated.ok) {
    console.error("CONFIG_INVALID:", validated.error);
    process.exit(2);
  }

  const { url, host, bucket, serviceRoleKey } = validated.config;
  console.log("1. Configuration");
  console.log(`   SUPABASE_URL: set (host=${host})`);
  console.log(`   SUPABASE_STORAGE_BUCKET: ${bucket}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: set (${serviceRoleKey.length} chars)\n`);

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let objects: ListedObject[] = [];
  let catalogPrefixExists = false;
  let listErrors: string[] = [];

  try {
    console.log("2. Listing storage prefix catalog/ ...");
    const result = await inventoryCatalogPrefix(client, bucket);
    objects = result.objects;
    catalogPrefixExists = result.catalogPrefixExists;
    listErrors = result.listErrors;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : error instanceof Error && error.cause
          ? String(error.cause)
          : "";
    console.error("\nCONNECTION_FAILED");
    console.error(`   Error: ${message}`);
    if (cause) console.error(`   Cause: ${cause}`);
    console.error("\nSTOP: Do not attempt production sync until Supabase is reachable.");
    process.exit(3);
  }

  const totalBytes = objects.reduce((sum, item) => sum + (item.size ?? 0), 0);
  const barbellPrefix = "catalog/barbell-row/";
  const barbellObjects = objects.filter((item) =>
    item.objectPath.startsWith(barbellPrefix),
  );

  const expectedPaths = buildExpectedLocalObjectPaths();
  const remotePaths = new Set(objects.map((item) => item.objectPath));
  const conflicts = [...expectedPaths].filter((path) => remotePaths.has(path));
  const unexpectedRemote = objects
    .map((item) => item.objectPath)
    .filter((path) => !expectedPaths.has(path));

  console.log("\n3. Inventory results");
  console.log(`   catalog/ prefix present: ${catalogPrefixExists ? "yes" : "no (empty or absent)"}`);
  console.log(`   Total objects under catalog/: ${objects.length}`);
  console.log(
    `   Total size (from list metadata): ${objects.length ? formatBytes(totalBytes) : "0 B"}`,
  );
  console.log(`   Expected local upload paths: ${expectedPaths.size}`);

  console.log("\n   catalog/barbell-row/ objects:");
  if (barbellObjects.length === 0) {
    console.log("     (none)");
  } else {
    for (const item of barbellObjects.sort((a, b) =>
      a.objectPath.localeCompare(b.objectPath),
    )) {
      console.log(
        `     ${item.objectPath}${item.size != null ? ` (${formatBytes(item.size)})` : ""}`,
      );
    }
  }

  const sampleRepdbIds = ["barbell-row", "ab-wheel-rollout", "dev-push-up"];
  console.log("\n   Sample RepDB catalog ID folders (object counts):");
  for (const id of sampleRepdbIds) {
    const count = objects.filter((item) =>
      item.objectPath.startsWith(`catalog/${id}/`),
    ).length;
    console.log(`     catalog/${id}/: ${count} object(s)`);
  }

  if (listErrors.length > 0) {
    console.log("\n   List warnings:");
    for (const warning of listErrors.slice(0, 20)) {
      console.log(`     - ${warning}`);
    }
    if (listErrors.length > 20) {
      console.log(`     ... and ${listErrors.length - 20} more`);
    }
  }

  console.log("\n4. Path conflict check (expected bundle vs remote)");
  console.log(`   Expected paths already present remotely: ${conflicts.length}`);
  if (conflicts.length > 0) {
    console.log("   Sample conflicts:");
    for (const path of conflicts.slice(0, 15)) {
      console.log(`     - ${path}`);
    }
    if (conflicts.length > 15) {
      console.log(`     ... and ${conflicts.length - 15} more`);
    }
  }
  console.log(`   Remote catalog objects not in bundle: ${unexpectedRemote.length}`);
  if (unexpectedRemote.length > 0 && unexpectedRemote.length <= 20) {
    for (const path of unexpectedRemote) {
      console.log(`     - ${path}`);
    }
  } else if (unexpectedRemote.length > 20) {
    for (const path of unexpectedRemote.slice(0, 15)) {
      console.log(`     - ${path}`);
    }
    console.log(`     ... and ${unexpectedRemote.length - 15} more`);
  }

  console.log("\n5. Storage readiness classification");
  if (objects.length === 0 && !catalogPrefixExists) {
    console.log("   A. Empty and safe for first upload");
  } else if (objects.length === 0 && catalogPrefixExists) {
    console.log("   A. Empty and safe for first upload (prefix exists but no files listed)");
  } else if (conflicts.length === expectedPaths.size && conflicts.length > 0) {
    console.log("   B. Contains existing objects requiring review (full overlap with bundle paths)");
  } else if (conflicts.length > 0 || unexpectedRemote.length > 0) {
    console.log("   B. Contains existing objects requiring review");
  } else {
    console.log("   A. Empty and safe for first upload");
  }

  console.log("\nInventory complete (no writes performed).");
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
