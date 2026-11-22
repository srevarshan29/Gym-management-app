/**
 * @deprecated Use `getExportDownloadTokenStore()` (Firestore-backed, serverless-safe).
 * Thin aliases kept for older tests importing these symbols.
 */
import {
  GYM_EXPORT_DOWNLOAD_TTL_MS,
  getExportDownloadTokenStore,
  type IssuedExportDownloadToken,
} from "@/lib/gym-lifecycle/export/export-download-token-store";

export { GYM_EXPORT_DOWNLOAD_TTL_MS };

export type GymExportDownloadToken = IssuedExportDownloadToken & {
  token: string;
  gymId: string;
  artifactPath: string;
  checksumSha256: string;
  expiresAtMs: number;
};

const legacyMemory = new Map<string, GymExportDownloadToken>();

export function clearGymExportDownloadTokensForTests(): void {
  legacyMemory.clear();
}

/** @deprecated */
export function issueGymExportDownloadToken(input: {
  gymId: string;
  artifactPath: string;
  checksumSha256: string;
  now?: Date;
}): GymExportDownloadToken {
  const now = input.now ?? new Date();
  const entry: GymExportDownloadToken = {
    bearerToken: "legacy-test-only",
    tokenDocId: "legacy",
    token: "legacy-test-only",
    gymId: input.gymId,
    artifactPath: input.artifactPath,
    checksumSha256: input.checksumSha256,
    expiresAtMs: now.getTime() + GYM_EXPORT_DOWNLOAD_TTL_MS,
  };
  legacyMemory.set(entry.token, entry);
  return entry;
}

/** @deprecated */
export function consumeGymExportDownloadToken(
  token: string,
  gymId: string,
  now: Date = new Date(),
): GymExportDownloadToken | { error: string } {
  const entry = legacyMemory.get(token);
  if (!entry) return { error: "Download link is invalid or expired." };
  if (entry.gymId !== gymId) return { error: "Download link does not match this gym." };
  if (entry.expiresAtMs <= now.getTime()) {
    legacyMemory.delete(token);
    return { error: "Download link has expired." };
  }
  return entry;
}

export { getExportDownloadTokenStore };