import { createSupabaseBackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";
import { validateTenantBackupStorageConfig } from "@/lib/gym-lifecycle/backup/config";
import {
  evaluatePromotedFullBackupEvidence,
  type SourceEvidenceValidationResult,
} from "@/lib/gym-lifecycle/backup/backup-source-evidence";
import { loadFullBackupVerificationBodies } from "@/lib/gym-lifecycle/backup/backup-purge-verification";
import { GYM_BACKUP_SCOPE_FULL } from "@/lib/gym-lifecycle/backup/backup-scope";
import { getRepositories, platformContext } from "@/lib/firestore";

export type ReadOnlyFullBackupVerificationResult = {
  ok: boolean;
  reason?: string;
  storageConfigured: boolean;
  eligibleForDestructiveDeletionVerification: boolean;
  evidenceStatus: "missing" | "incomplete" | "verified" | "failed";
  backupCompletedJobId: string | null;
  backupId: string | null;
  backupVerifiedAt: string | null;
  manifestChecksum: string | null;
  manifestChecksumDisplay: string | null;
};

function truncateChecksum(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 16) return value;
  return `${value.slice(0, 12)}…${value.slice(-4)}`;
}

/**
 * Read-only verification of a promoted full backup against objects in the private backup bucket.
 * Performs no Firestore writes, no uploads, and does not consult export/deletion feature flags.
 */
export async function verifyStoredFullBackupReadOnly(
  gymId: string,
): Promise<ReadOnlyFullBackupVerificationResult> {
  const storageConfigured = validateTenantBackupStorageConfig().ok;
  const { gyms, gymTenantBackupJobs } = getRepositories();
  const gym = await gyms.getById(platformContext, gymId);
  if (!gym) {
    return {
      ok: false,
      reason: "Gym not found.",
      storageConfigured,
      eligibleForDestructiveDeletionVerification: false,
      evidenceStatus: "missing",
      backupCompletedJobId: null,
      backupId: null,
      backupVerifiedAt: null,
      manifestChecksum: null,
      manifestChecksumDisplay: null,
    };
  }

  const base = {
    storageConfigured,
    backupCompletedJobId: gym.backupCompletedJobId ?? null,
    backupId: gym.backupSourceEvidence?.binding?.backupId ?? null,
    backupVerifiedAt: gym.backupVerifiedAt?.toDate().toISOString() ?? null,
    manifestChecksum: gym.backupManifestChecksum ?? null,
    manifestChecksumDisplay: truncateChecksum(gym.backupManifestChecksum),
    eligibleForDestructiveDeletionVerification:
      gym.backupScope === GYM_BACKUP_SCOPE_FULL &&
      Boolean(gym.backupCompletedJobId) &&
      Boolean(gym.backupManifestChecksum) &&
      Boolean(gym.backupSourceEvidence?.binding),
  };

  if (gym.backupScope !== GYM_BACKUP_SCOPE_FULL) {
    return {
      ...base,
      ok: false,
      reason: "Gym does not have a promoted full backup.",
      evidenceStatus: "incomplete",
    };
  }

  if (!gym.backupCompletedJobId || !gym.backupSourceEvidence?.binding) {
    return {
      ...base,
      ok: false,
      reason: "Full backup binding or completed job reference is missing.",
      evidenceStatus: "incomplete",
    };
  }

  if (!storageConfigured) {
    return {
      ...base,
      ok: false,
      reason: "Backup storage is not configured; cannot verify stored artifacts.",
      evidenceStatus: "incomplete",
    };
  }

  const backupJob = await gymTenantBackupJobs.getById(gym.backupCompletedJobId);
  if (!backupJob) {
    return {
      ...base,
      ok: false,
      reason: "Completed backup job record is missing.",
      evidenceStatus: "failed",
    };
  }

  let evidenceCheck: SourceEvidenceValidationResult;
  try {
    const storage = await createSupabaseBackupStorageAdapter();
    const bodies = await loadFullBackupVerificationBodies(storage, backupJob);
    evidenceCheck = evaluatePromotedFullBackupEvidence({
      gym: { ...gym, id: gym.id },
      backupJob: { ...backupJob, id: gym.backupCompletedJobId },
      pathsManifestBody: bodies.pathsManifestBody,
      objectBodiesByArtifactPath: bodies.objectBodiesByArtifactPath,
      postgresArtifactBodies: bodies.postgresArtifactBodies,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stored backup verification failed.";
    return {
      ...base,
      ok: false,
      reason: message,
      evidenceStatus: "failed",
    };
  }

  return {
    ...base,
    ok: evidenceCheck.ok,
    reason: evidenceCheck.ok ? undefined : evidenceCheck.reason,
    evidenceStatus: evidenceCheck.ok ? "verified" : "failed",
  };
}