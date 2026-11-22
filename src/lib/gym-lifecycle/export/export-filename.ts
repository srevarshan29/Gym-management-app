const UNSAFE = /[^a-zA-Z0-9._-]+/g;

/** Safe attachment filename for gym data exports (no path segments). */
export function safeGymExportDownloadFilename(input: {
  gymId: string;
  gymName?: string | null;
  exportId: string;
  extension: "zip" | "json";
}): string {
  const base =
    input.gymName?.trim().replace(UNSAFE, "-").slice(0, 48) ||
    input.gymId.replace(UNSAFE, "-").slice(0, 48);
  const stamp = input.exportId.replace(UNSAFE, "-").slice(0, 24);
  return `gymdesk-export-${base}-${stamp}.${input.extension}`;
}

/** Map a tenant storage path to a zip entry path (blocks traversal). */
export function storagePathToZipEntryPath(gymId: string, absoluteStoragePath: string): string {
  const prefix = `gyms/${gymId}/`;
  if (!absoluteStoragePath.startsWith(prefix)) {
    throw new Error(`Storage path is outside tenant prefix for gym ${gymId}.`);
  }
  const relative = absoluteStoragePath.slice(prefix.length);
  if (relative.includes("..") || relative.startsWith("/") || relative.includes("\\")) {
    throw new Error("Invalid storage path for export.");
  }
  return `assets/${relative.replace(/\\/g, "/")}`;
}