export type GymExportCategoryStatus = "complete" | "partial" | "skipped" | "failed";

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

export function manifestSummaryComplete(manifest: GymDataExportManifestV2): boolean {
  if (!manifest.complete) return false;
  const cats = manifest.categories;
  if (cats.firestore.status !== "complete") return false;
  if (cats.financial.status !== "complete") return false;
  if (cats.storageAssets.status === "failed" || cats.storageAssets.status === "partial") {
    return false;
  }
  return true;
}