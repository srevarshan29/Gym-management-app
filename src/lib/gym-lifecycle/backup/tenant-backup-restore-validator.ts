import type { SerializedFirestoreDoc } from "@/lib/gym-lifecycle/backup/firestore-tenant-export";
import type { TenantBackupManifestV1 } from "@/lib/gym-lifecycle/backup/backup-format";
import type { BackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";
import { TENANT_BACKUP_PLATFORM_EXCLUDE } from "@/lib/gym-lifecycle/backup/tenant-data-inventory";

export type RestoreValidationTarget = {
  firestore: Map<string, SerializedFirestoreDoc>;
  storagePaths: Set<string>;
  postgresTables: Map<string, unknown[]>;
};

export type RestoreValidationResult =
  | { ok: true; summary: Record<string, number> }
  | { ok: false; error: string };

export function createIsolatedRestoreTarget(): RestoreValidationTarget {
  return {
    firestore: new Map(),
    storagePaths: new Set(),
    postgresTables: new Map(),
  };
}

/** Applies backup shards into an isolated in-memory target — never production. */
export async function restoreIntoIsolatedTarget(
  storage: BackupStorageAdapter,
  manifest: TenantBackupManifestV1,
  target: RestoreValidationTarget,
  gymId: string,
): Promise<void> {
  for (const artifact of manifest.artifacts) {
    const body = await storage.download(artifact.path);
    if (artifact.path.includes("/firestore/")) {
      const docs = JSON.parse(body.toString("utf8")) as SerializedFirestoreDoc[];
      for (const doc of docs) {
        if (TENANT_BACKUP_PLATFORM_EXCLUDE.has(doc.collection)) {
          throw new Error(`Restore refused global collection ${doc.collection}.`);
        }
        if ("gymId" in doc.data && doc.data.gymId !== gymId) {
          throw new Error(`Restore refused cross-tenant document ${doc.path}.`);
        }
        target.firestore.set(doc.path, doc);
      }
    } else if (artifact.path.endsWith("/storage/paths.json")) {
      const paths = JSON.parse(body.toString("utf8")) as string[];
      for (const p of paths) {
        if (!p.startsWith(`gyms/${gymId}/`)) {
          throw new Error(`Restore refused non-tenant storage path ${p}.`);
        }
        target.storagePaths.add(p);
      }
    } else if (artifact.path.includes("/storage/objects/")) {
      target.storagePaths.add(`bytes:${artifact.path}:${body.byteLength}`);
    } else if (artifact.path.includes("/postgres/")) {
      const payload = JSON.parse(body.toString("utf8")) as { table: string; rows: unknown[] };
      target.postgresTables.set(payload.table, payload.rows);
    }
  }
}

export function validateRestoredCounts(
  target: RestoreValidationTarget,
  manifest: TenantBackupManifestV1,
): RestoreValidationResult {
  const summary: Record<string, number> = {
    firestoreDocs: target.firestore.size,
    storageObjects: target.storagePaths.size,
    postgresTables: target.postgresTables.size,
  };
  for (const [key, count] of Object.entries(manifest.inventoryCounts)) {
    if (key.startsWith("firestore:")) {
      const docs = [...target.firestore.values()].filter((d) =>
        d.path.startsWith(`${key.replace("firestore:", "")}/`),
      );
      if (docs.length < count) {
        return { ok: false, error: `Restored Firestore count low for ${key}.` };
      }
    }
    if (key === "storage:objects") {
      const listed = [...target.storagePaths].filter((p) => !p.startsWith("bytes:")).length;
      const binaries = [...target.storagePaths].filter((p) => p.startsWith("bytes:")).length;
      if (count > 0 && listed + binaries < count) {
        return { ok: false, error: "Restored Supabase object count is low." };
      }
    }
    if (key.startsWith("postgres:")) {
      const table = key.replace("postgres:", "");
      const rows = target.postgresTables.get(table);
      const rowCount = rows?.length ?? 0;
      if (rowCount < count) {
        return { ok: false, error: `Restored Postgres count low for ${table}.` };
      }
    }
  }
  return { ok: true, summary };
}