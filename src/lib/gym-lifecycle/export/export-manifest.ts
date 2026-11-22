export type GymExportCategoryStatus = "complete" | "partial" | "skipped" | "failed";

/** Overall tenant export quality (distinct from Firestore `dataExportStatus`). */
export type GymDataExportCompleteness =
  | "complete"
  | "records_only"
  | "partial"
  | "failed";

export type GymExportStorageInput =
  | { kind: "lister"; lister: import("@/lib/gym-lifecycle/backup/supabase-tenant-export").SupabaseStorageLister }
  | { kind: "records_only"; skippedReason: string }
  | { kind: "config_error"; error: string };

export type GymDataExportManifestV2 = {
  formatVersion: 2;
  gymId: string;
  exportId: string;
  exportedAt: string;
  /** False when any required category failed or was only partially collected. */
  complete: boolean;
  categories: {
    firestore: {
      status: GymExportCategoryStatus;
      counts: Record<string, number>;
      error?: string;
    };
    financial: {
      status: GymExportCategoryStatus;
      counts: Record<string, number>;
      error?: string;
    };
    storageAssets: {
      status: GymExportCategoryStatus;
      included: number;
      failed: Array<{ path: string; error: string }>;
      skippedReason?: string;
    };
  };
  files: Array<{
    zipPath: string;
    sizeBytes: number;
    checksumSha256: string;
  }>;
  inventory: Record<string, unknown>;
};

export function resolveGymDataExportCompleteness(
  manifest: Pick<GymDataExportManifestV2, "categories">,
): GymDataExportCompleteness {
  const cats = manifest.categories;
  if (cats.firestore.status === "failed" || cats.financial.status === "failed") {
    return "failed";
  }
  if (cats.firestore.status !== "complete" || cats.financial.status !== "complete") {
    return "failed";
  }
  if (cats.storageAssets.status === "failed") {
    return "failed";
  }
  if (cats.storageAssets.status === "partial") {
    return "partial";
  }
  if (cats.storageAssets.status === "skipped") {
    return "records_only";
  }
  if (cats.storageAssets.status === "complete") {
    return "complete";
  }
  return "failed";
}

export function manifestSummaryComplete(manifest: GymDataExportManifestV2): boolean {
  return resolveGymDataExportCompleteness(manifest) === "complete";
}