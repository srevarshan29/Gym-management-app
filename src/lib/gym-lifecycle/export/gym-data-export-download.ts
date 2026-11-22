import { sha256Hex } from "@/lib/gym-lifecycle/backup/checksum";
import {
  createSupabaseBackupStorageAdapter,
  type BackupStorageAdapter,
} from "@/lib/gym-lifecycle/backup/backup-storage";
import { validateTenantBackupStorageConfig } from "@/lib/gym-lifecycle/backup/config";
import { safeGymExportDownloadFilename } from "@/lib/gym-lifecycle/export/export-filename";
import {
  assertExportRateLimit,
} from "@/lib/gym-lifecycle/export/export-rate-limit";
import { getExportDownloadTokenStore } from "@/lib/gym-lifecycle/export/export-download-token-store";
import { getRepositories, platformContext } from "@/lib/firestore";
import type { GymDoc } from "@/lib/firestore/types";

export type GymExportDownloadEligibility =
  | { ok: true; gym: GymDoc & { id: string } }
  | { ok: false; error: string; status: number };

export function evaluateGymExportReadyForDownload(
  gym: (GymDoc & { id: string }) | null,
  now = new Date(),
): GymExportDownloadEligibility {
  if (!gym) return { ok: false, error: "Gym not found.", status: 404 };
  if (gym.dataExportStatus !== "ready") {
    const label = gym.dataExportStatus ?? "none";
    return { ok: false, error: `Export is not ready (status: ${label}).`, status: 409 };
  }
  if (!gym.dataExportId || !gym.dataExportArtifactRef || !gym.dataExportChecksum) {
    return { ok: false, error: "Export metadata is missing.", status: 409 };
  }
  const expires = gym.dataExportDownloadExpiresAt?.toDate();
  if (!expires || expires.getTime() <= now.getTime()) {
    return { ok: false, error: "Export download window has expired.", status: 410 };
  }
  return { ok: true, gym };
}

export async function issueGymDataExportDownloadAuthorization(input: {
  gymId: string;
  superAdminUserId: string;
  now?: Date;
}): Promise<{ bearerToken: string; expiresAt: string; exportId: string }> {
  const rate = await assertExportRateLimit({
    kind: "export_download",
    scopeId: input.superAdminUserId,
    now: input.now,
  });
  if (!rate.ok) throw new Error(rate.error);

  const { gyms } = getRepositories();
  const gym = await gyms.getById(platformContext, input.gymId);
  const eligible = evaluateGymExportReadyForDownload(gym, input.now);
  if (!eligible.ok) throw new Error(eligible.error);

  const g = eligible.gym;
  const issued = await getExportDownloadTokenStore().issue({
    gymId: g.id,
    exportId: g.dataExportId!,
    artifactPath: g.dataExportArtifactRef!,
    checksumSha256: g.dataExportChecksum!,
    issuedToUserId: input.superAdminUserId,
    now: input.now,
  });

  return {
    bearerToken: issued.bearerToken,
    expiresAt: new Date(issued.expiresAtMs).toISOString(),
    exportId: g.dataExportId!,
  };
}

export async function redeemAndLoadGymExportArtifact(input: {
  gymId: string;
  exportId: string;
  bearerToken: string;
  superAdminUserId: string;
  storage?: BackupStorageAdapter;
  now?: Date;
}): Promise<
  | {
      ok: true;
      body: Buffer;
      checksumSha256: string;
      filename: string;
    }
  | { ok: false; error: string; status: number }
> {
  const { gyms } = getRepositories();
  const gym = await gyms.getById(platformContext, input.gymId);
  const eligible = evaluateGymExportReadyForDownload(gym, input.now);
  if (!eligible.ok) return { ok: false, error: eligible.error, status: eligible.status };
  if (eligible.gym.dataExportId !== input.exportId) {
    return { ok: false, error: "Export id does not match the current gym export.", status: 409 };
  }

  const redeemed = await getExportDownloadTokenStore().redeem({
    bearerToken: input.bearerToken,
    gymId: input.gymId,
    exportId: input.exportId,
    superAdminUserId: input.superAdminUserId,
    now: input.now,
  });
  if (!redeemed.ok) return { ok: false, error: redeemed.error, status: 403 };

  if (redeemed.artifactPath !== eligible.gym.dataExportArtifactRef) {
    return { ok: false, error: "Artifact reference mismatch.", status: 409 };
  }
  if (redeemed.checksumSha256 !== eligible.gym.dataExportChecksum) {
    return { ok: false, error: "Artifact checksum mismatch.", status: 409 };
  }

  let body: Buffer;
  if (input.storage) {
    body = await input.storage.download(redeemed.artifactPath);
  } else {
    const storageConfig = validateTenantBackupStorageConfig();
    if (!storageConfig.ok) {
      return { ok: false, error: storageConfig.error, status: 503 };
    }
    const storage = await createSupabaseBackupStorageAdapter();
    try {
      body = await storage.download(redeemed.artifactPath);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load export artifact.",
        status: 404,
      };
    }
  }

  const checksum = sha256Hex(body);
  if (checksum !== redeemed.checksumSha256) {
    return { ok: false, error: "Export artifact failed integrity check.", status: 500 };
  }

  const filename = safeGymExportDownloadFilename({
    gymId: eligible.gym.id,
    gymName: eligible.gym.name,
    exportId: input.exportId,
    extension: "zip",
  });

  return { ok: true, body, checksumSha256: checksum, filename };
}