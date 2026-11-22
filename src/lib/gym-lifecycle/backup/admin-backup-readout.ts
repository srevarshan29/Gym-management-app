import { GYM_BACKUP_SCOPE_FULL } from "@/lib/gym-lifecycle/backup/backup-scope";
import type { GymDoc } from "@/lib/firestore/types";

export type AdminPersistedFullBackupReadout = {
  backupCompletedJobId: string | null;
  backupId: string | null;
  lastVerificationAt: string | null;
  manifestChecksum: string | null;
  manifestChecksumDisplay: string | null;
  /** Metadata recorded when the backup job last passed artifact verification — not a live re-check. */
  persistedEvidenceStatus: "missing" | "incomplete" | "verified" | "failed";
  lastStoredVerificationSucceeded: boolean;
  /** Purge and destructive deletes always require a fresh server-side artifact load. */
  freshDestructiveVerificationRequired: boolean;
  /** Persisted gym metadata must never imply current purge authorization. */
  staleForPurgeAuthorization: boolean;
  eligibleForDestructiveDeletionVerification: boolean;
  integrityVerifiedAt: string | null;
};

function truncateChecksum(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 16) return value;
  return `${value.slice(0, 12)}…${value.slice(-4)}`;
}

/**
 * Builds admin UI readout from persisted gym fields only — no storage downloads.
 */
export function buildPersistedFullBackupAdminReadout(
  gym: Pick<
    GymDoc,
    | "backupScope"
    | "backupStatus"
    | "backupCompletedJobId"
    | "backupVerifiedAt"
    | "backupManifestChecksum"
    | "backupSourceEvidence"
  > & { id: string },
): AdminPersistedFullBackupReadout | null {
  const show =
    Boolean(gym.backupCompletedJobId) ||
    gym.backupScope === GYM_BACKUP_SCOPE_FULL ||
    Boolean(gym.backupSourceEvidence);
  if (!show) return null;

  const binding = gym.backupSourceEvidence?.binding;
  const firestore = gym.backupSourceEvidence?.firestore;
  const fullPromoted = gym.backupScope === GYM_BACKUP_SCOPE_FULL && gym.backupStatus === "succeeded";
  const integrityOk =
    firestore?.documentIntegrityVerified === true &&
    gym.backupSourceEvidence?.postgres?.integrityVerified === true &&
    gym.backupSourceEvidence?.supabase?.integrityVerified === true;

  let persistedEvidenceStatus: AdminPersistedFullBackupReadout["persistedEvidenceStatus"] =
    "incomplete";
  if (!gym.backupCompletedJobId && gym.backupScope !== GYM_BACKUP_SCOPE_FULL) {
    persistedEvidenceStatus = "missing";
  } else if (fullPromoted && integrityOk && Boolean(gym.backupManifestChecksum)) {
    persistedEvidenceStatus = "verified";
  } else if (gym.backupStatus === "failed") {
    persistedEvidenceStatus = "failed";
  }

  const lastStoredVerificationSucceeded =
    fullPromoted && persistedEvidenceStatus === "verified" && Boolean(binding);

  return {
    backupCompletedJobId: gym.backupCompletedJobId ?? null,
    backupId: binding?.backupId ?? null,
    lastVerificationAt: gym.backupVerifiedAt?.toDate().toISOString() ?? binding?.backupVerifiedAt ?? null,
    manifestChecksum: gym.backupManifestChecksum ?? null,
    manifestChecksumDisplay: truncateChecksum(gym.backupManifestChecksum),
    persistedEvidenceStatus,
    lastStoredVerificationSucceeded,
    freshDestructiveVerificationRequired: true,
    staleForPurgeAuthorization: true,
    eligibleForDestructiveDeletionVerification:
      fullPromoted &&
      lastStoredVerificationSucceeded &&
      Boolean(gym.backupCompletedJobId) &&
      Boolean(binding),
    integrityVerifiedAt: firestore?.integrityVerifiedAt ?? null,
  };
}