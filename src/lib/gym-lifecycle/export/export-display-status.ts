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