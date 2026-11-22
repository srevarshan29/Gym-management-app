import { PassThrough } from "stream";
import archiverCb from "archiver";

import { sha256Hex } from "@/lib/gym-lifecycle/backup/checksum";
import type { SupabaseStorageLister } from "@/lib/gym-lifecycle/backup/supabase-tenant-export";
import {
  listAllTenantStorageObjects,
} from "@/lib/gym-lifecycle/backup/supabase-tenant-export";
import { storagePathToZipEntryPath } from "@/lib/gym-lifecycle/export/export-filename";
import type { GymDataExportManifestV2 } from "@/lib/gym-lifecycle/export/export-manifest";
import type { GymDataExportBundleV1 } from "@/lib/gym-lifecycle/export/gym-data-export";

export const GYM_EXPORT_ASSET_BATCH_SIZE = 5;

export type BuildGymExportArchiveInput = {
  gymId: string;
  exportId: string;
  bundle: GymDataExportBundleV1;
  storageLister?: SupabaseStorageLister | null;
  assetBatchSize?: number;
};

export type BuildGymExportArchiveResult = {
  zipBody: Buffer;
  manifest: GymDataExportManifestV2;
  checksumSha256: string;
  sizeBytes: number;
};

function pushChunk(chunks: Buffer[], chunk: Buffer) {
  chunks.push(chunk);
}

export async function buildGymDataExportZip(
  input: BuildGymExportArchiveInput,
): Promise<BuildGymExportArchiveResult> {
  const assetBatch = input.assetBatchSize ?? GYM_EXPORT_ASSET_BATCH_SIZE;
  const files: GymDataExportManifestV2["files"] = [];
  const chunks: Buffer[] = [];

  const archiver = archiverCb as unknown as (
    format: string,
    options?: { zlib?: { level?: number } },
  ) => archiverCb.Archiver;
  const archive = archiver("zip", { zlib: { level: 6 } });
  const passthrough = new PassThrough();
  passthrough.on("data", (c: Buffer) => pushChunk(chunks, c));

  const zipDone = new Promise<void>((resolve, reject) => {
    passthrough.on("finish", () => resolve());
    passthrough.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(passthrough);

  const firestoreCounts: Record<string, number> = {};
  let firestoreError: string | undefined;
  let firestoreStatus: GymDataExportManifestV2["categories"]["firestore"]["status"] = "complete";
  try {
    for (const [collection, docs] of Object.entries(input.bundle.firestore)) {
      const json = JSON.stringify(docs, null, 2);
      const zipPath = `data/firestore/${collection}.json`;
      archive.append(json, { name: zipPath });
      const checksum = sha256Hex(Buffer.from(json, "utf8"));
      files.push({ zipPath, sizeBytes: Buffer.byteLength(json, "utf8"), checksumSha256: checksum });
      firestoreCounts[collection] = docs.length;
    }
  } catch (error) {
    firestoreStatus = "failed";
    firestoreError = error instanceof Error ? error.message : "Firestore export serialization failed.";
  }

  const financial = input.bundle.financial;
  const financialCounts: Record<string, number> = {
    payments: financial.payments.length,
    receipts: financial.receipts.length,
    ledgerTransactions: financial.ledgerTransactions.length,
    subscriptions: financial.subscriptions.length,
  };
  let financialStatus: GymDataExportManifestV2["categories"]["financial"]["status"] = "complete";
  let financialError: string | undefined;
  try {
    const financialJson = JSON.stringify(financial, null, 2);
    const zipPath = "data/financial/records.json";
    archive.append(financialJson, { name: zipPath });
    files.push({
      zipPath,
      sizeBytes: Buffer.byteLength(financialJson, "utf8"),
      checksumSha256: sha256Hex(Buffer.from(financialJson, "utf8")),
    });
  } catch (error) {
    financialStatus = "failed";
    financialError = error instanceof Error ? error.message : "Financial export serialization failed.";
  }

  const gymJson = JSON.stringify(input.bundle.gym, null, 2);
  archive.append(gymJson, { name: "data/gym/profile.json" });
  files.push({
    zipPath: "data/gym/profile.json",
    sizeBytes: Buffer.byteLength(gymJson, "utf8"),
    checksumSha256: sha256Hex(Buffer.from(gymJson, "utf8")),
  });

  const storageFailed: Array<{ path: string; error: string }> = [];
  let storageIncluded = 0;
  let storageStatus: GymDataExportManifestV2["categories"]["storageAssets"]["status"] = "complete";
  let storageSkippedReason: string | undefined;

  if (!input.storageLister) {
    storageStatus = "skipped";
    storageSkippedReason = "Tenant asset storage is not configured.";
  } else {
    try {
      const paths = await listAllTenantStorageObjects(input.storageLister, input.gymId);
      for (let i = 0; i < paths.length; i += assetBatch) {
        const batch = paths.slice(i, i + assetBatch);
        for (const path of batch) {
          try {
            const bytes = await input.storageLister.download(path);
            const zipPath = storagePathToZipEntryPath(input.gymId, path);
            archive.append(bytes, { name: zipPath });
            files.push({
              zipPath,
              sizeBytes: bytes.byteLength,
              checksumSha256: sha256Hex(bytes),
            });
            storageIncluded += 1;
          } catch (error) {
            storageFailed.push({
              path,
              error: error instanceof Error ? error.message : "download failed",
            });
          }
        }
      }
      if (storageFailed.length > 0) {
        storageStatus = "partial";
      }
    } catch (error) {
      storageStatus = "failed";
      storageFailed.push({
        path: "*",
        error: error instanceof Error ? error.message : "Storage listing failed.",
      });
    }
  }

  const manifest: GymDataExportManifestV2 = {
    formatVersion: 2,
    gymId: input.gymId,
    exportId: input.exportId,
    exportedAt: input.bundle.exportedAt,
    complete:
      firestoreStatus === "complete" &&
      financialStatus === "complete" &&
      (storageStatus === "complete" || storageStatus === "skipped"),
    categories: {
      firestore: { status: firestoreStatus, counts: firestoreCounts, error: firestoreError },
      financial: { status: financialStatus, counts: financialCounts, error: financialError },
      storageAssets: {
        status: storageStatus,
        included: storageIncluded,
        failed: storageFailed,
        skippedReason: storageSkippedReason,
      },
    },
    files,
    inventory: input.bundle.inventory as Record<string, unknown>,
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  archive.append(manifestJson, { name: "manifest.json" });
  files.push({
    zipPath: "manifest.json",
    sizeBytes: Buffer.byteLength(manifestJson, "utf8"),
    checksumSha256: sha256Hex(Buffer.from(manifestJson, "utf8")),
  });

  await archive.finalize();
  await zipDone;

  const zipBody = Buffer.concat(chunks);
  const checksumSha256 = sha256Hex(zipBody);

  return {
    zipBody,
    manifest,
    checksumSha256,
    sizeBytes: zipBody.byteLength,
  };
}