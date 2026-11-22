import type { GymDataExportCompleteness } from "@/lib/gym-lifecycle/export/export-manifest";

export type GymExportDisplayStatus =
  | "not_requested"
  | "processing"
  | "ready"
  | "failed"
  | "expired";

export function resolveGymExportDisplayStatus(input: {
  dataExportStatus: "none" | "pending" | "ready" | "failed" | null;
  dataExportDownloadExpiresAt: Date | null;
  now?: Date;
}): GymExportDisplayStatus {
  const now = input.now ?? new Date();
  const raw = input.dataExportStatus;
  if (!raw || raw === "none") return "not_requested";
  if (raw === "pending") return "processing";
  if (raw === "failed") return "failed";
  if (raw === "ready") {
    const exp = input.dataExportDownloadExpiresAt;
    if (exp && exp.getTime() <= now.getTime()) return "expired";
    return "ready";
  }
  return "not_requested";
}

export function gymExportDisplayStatusLabel(status: GymExportDisplayStatus): string {
  switch (status) {
    case "not_requested":
      return "Not requested";
    case "processing":
      return "Processing";
    case "ready":
      return "Ready to download";
    case "failed":
      return "Failed";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export function gymExportCompletenessLabel(
  completeness: GymDataExportCompleteness | null | undefined,
): string {
  switch (completeness) {
    case "complete":
      return "Complete (records and tenant files)";
    case "records_only":
      return "Records only (tenant files not included)";
    case "partial":
      return "Partial (some tenant files missing)";
    case "failed":
      return "Failed";
    default:
      return "Unknown";
  }
}

export function gymExportCompletenessAdminWarning(
  completeness: GymDataExportCompleteness | null | undefined,
): string | null {
  switch (completeness) {
    case "records_only":
      return "Warning: tenant-owned files were not included. This ZIP is a records-only export.";
    case "partial":
      return "Warning: some tenant-owned files could not be collected. Review manifest.json in the ZIP.";
    default:
      return null;
  }
}