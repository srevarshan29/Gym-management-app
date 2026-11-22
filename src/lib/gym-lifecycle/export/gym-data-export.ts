import { getFirestoreDb, getRepositories, platformContext } from "@/lib/firestore";
import { newDocId } from "@/lib/firestore/helpers";
import { buildGymTenantInventory } from "@/lib/gym-lifecycle/purge/inventory-builder";
import { exportGymFinancialRecords } from "@/lib/gym-lifecycle/financial-export";
import {
  exportFirestoreCollectionPage,
  exportGymRootDocuments,
} from "@/lib/gym-lifecycle/backup/firestore-tenant-export";
import { TENANT_GYM_ID_COLLECTIONS } from "@/lib/gym-lifecycle/backup/tenant-data-inventory";
import { sanitizeGymSnapshot, sanitizeRecordForExport } from "@/lib/gym-lifecycle/export/export-sanitize";
import { isGymDataExportEnabled } from "@/lib/gym-lifecycle/export/export-config";
import { GYM_EXPORT_ARTIFACT_AVAILABILITY_MS } from "@/lib/gym-lifecycle/export/export-download-token-store";
import { manifestSummaryComplete } from "@/lib/gym-lifecycle/export/export-manifest";
import { buildGymDataExportZip } from "@/lib/gym-lifecycle/export/gym-data-export-archive";
import { createSupabaseTenantAssetsLister } from "@/lib/gym-lifecycle/backup/supabase-tenant-assets-lister";
import type { SupabaseStorageLister } from "@/lib/gym-lifecycle/backup/supabase-tenant-export";
import { validateTenantBackupStorageConfig } from "@/lib/gym-lifecycle/backup/config";
import { createSupabaseBackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";

export type GymDataExportBundleV1 = {
  formatVersion: 1;
  gymId: string;
  exportedAt: string;
  inventory: Awaited<ReturnType<typeof buildGymTenantInventory>>;
  gym: Record<string, unknown>;
  firestore: Record<string, unknown[]>;
  financial: {
    payments: unknown[];
    receipts: unknown[];
    ledgerTransactions: unknown[];
    subscriptions: unknown[];
  };
};

export type GymDataExportResult =
  | {
      ok: true;
      exportId: string;
      artifactPath: string;
      checksumSha256: string;
      sizeBytes: number;
      complete: boolean;
      artifactExpiresAt: string;
    }
  | { ok: false; error: string };

async function collectFirestoreExport(gymId: string): Promise<Record<string, unknown[]>> {
  const db = getFirestoreDb();
  const firestore: Record<string, unknown[]> = {};
  const roots = await exportGymRootDocuments(db, gymId);
  firestore["gym-roots"] = roots.map((d) =>
    sanitizeRecordForExport({ ...d.data, _path: d.path, _id: d.id }),
  );

  for (const collection of TENANT_GYM_ID_COLLECTIONS) {
    const docs: unknown[] = [];
    let cursor: string | null = null;
    for (;;) {
      const page = await exportFirestoreCollectionPage(db, gymId, collection, cursor);
      for (const doc of page.docs) {
        if (doc.data.gymId !== gymId && collection !== "users") {
          throw new Error(`Export isolation violation in ${collection} for doc ${doc.id}.`);
        }
        docs.push(sanitizeRecordForExport({ ...doc.data, _path: doc.path, _id: doc.id }));
      }
      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }
    firestore[collection] = docs;
  }
  return firestore;
}

export async function buildGymDataExportBundle(gymId: string): Promise<GymDataExportBundleV1> {
  const { gyms } = getRepositories();
  const gym = await gyms.getById(platformContext, gymId);
  if (!gym) throw new Error("Gym not found.");
  if (gym.id !== gymId) throw new Error("Gym id mismatch.");

  const db = getFirestoreDb();
  const inventory = await buildGymTenantInventory(db, gymId);
  const financial = await exportGymFinancialRecords(db, gymId);
  const firestore = await collectFirestoreExport(gymId);

  const gymSnap = sanitizeGymSnapshot({
    id: gym.id,
    name: gym.name,
    slug: gym.slug,
    status: gym.status ?? "active",
    createdAt: gym.createdAt.toDate().toISOString(),
    deactivatedAt: gym.deactivatedAt?.toDate().toISOString() ?? null,
  });

  return {
    formatVersion: 1,
    gymId,
    exportedAt: new Date().toISOString(),
    inventory,
    gym: gymSnap,
    firestore,
    financial: {
      payments: financial.payments.map((r) =>
        sanitizeRecordForExport(r as Record<string, unknown>),
      ),
      receipts: financial.receipts.map((r) =>
        sanitizeRecordForExport(r as Record<string, unknown>),
      ),
      ledgerTransactions: financial.ledgerTransactions.map((r) =>
        sanitizeRecordForExport(r as Record<string, unknown>),
      ),
      subscriptions: financial.subscriptions.map((r) =>
        sanitizeRecordForExport(r as Record<string, unknown>),
      ),
    },
  };
}

async function resolveStorageLister(
  gymId: string,
  override?: SupabaseStorageLister | null,
): Promise<SupabaseStorageLister | null> {
  if (override !== undefined) return override;
  try {
    return await createSupabaseTenantAssetsLister(gymId);
  } catch {
    return null;
  }
}

export async function runOptionalGymDataExport(input: {
  gymId: string;
  exportId?: string;
  writer?: {
    write(objectPath: string, body: Buffer): Promise<void>;
  };
  buildBundle?: (gymId: string) => Promise<GymDataExportBundleV1>;
  storageLister?: SupabaseStorageLister | null;
}): Promise<GymDataExportResult> {
  if (!isGymDataExportEnabled() && !input.writer) {
    return {
      ok: false,
      error: "Gym data export is disabled. Set ALLOW_TENANT_GYM_DATA_EXPORT=true to enable.",
    };
  }

  try {
    const exportId = input.exportId ?? newDocId();
    const buildBundle = input.buildBundle ?? buildGymDataExportBundle;
    const bundle = await buildBundle(input.gymId);
    const lister = await resolveStorageLister(input.gymId, input.storageLister);
    const archive = await buildGymDataExportZip({
      gymId: input.gymId,
      exportId,
      bundle,
      storageLister: lister,
    });

    const complete = manifestSummaryComplete(archive.manifest);
    const objectPath = `gym-exports/${input.gymId}/${exportId}.zip`;
    const now = Date.now();
    const artifactExpiresAt = new Date(now + GYM_EXPORT_ARTIFACT_AVAILABILITY_MS).toISOString();

    if (input.writer) {
      await input.writer.write(objectPath, archive.zipBody);
    } else {
      const storageConfig = validateTenantBackupStorageConfig();
      if (!storageConfig.ok) {
        return { ok: false, error: storageConfig.error };
      }
      const storage = await createSupabaseBackupStorageAdapter();
      await storage.upload({
        objectPath,
        body: archive.zipBody,
        contentType: "application/zip",
      });
    }

    return {
      ok: true,
      exportId,
      artifactPath: objectPath,
      checksumSha256: archive.checksumSha256,
      sizeBytes: archive.sizeBytes,
      complete,
      artifactExpiresAt,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Export failed.",
    };
  }
}