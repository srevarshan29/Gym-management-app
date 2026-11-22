import { Timestamp } from "firebase-admin/firestore";

import { GYM_BACKUP_SCOPE_FULL } from "@/lib/gym-lifecycle/backup/backup-scope";
import { validateTenantBackupSourceEvidence } from "@/lib/gym-lifecycle/backup/backup-source-evidence";
import type { GymTenantBackupJobDoc } from "@/lib/firestore/repositories/gym-tenant-backup-jobs";
import type { GymDoc } from "@/lib/firestore/types";

export function canPromoteTenantFullBackup(
  gym: Pick<GymDoc, "status"> & { id: string },
  job: Pick<
    GymTenantBackupJobDoc,
    | "gymId"
    | "backupId"
    | "phase"
    | "verificationStatus"
    | "restoreValidationStatus"
    | "manifestChecksumSha256"
    | "deletionJobId"
    | "artifacts"
    | "sourceEvidence"
    | "sourceEvidenceArtifactsVerified"
  >,
): { ok: true } | { ok: false; reason: string } {
  if (job.gymId !== gym.id) {
    return { ok: false, reason: "Backup job does not belong to this gym." };
  }
  if (job.phase !== "completed") {
    return { ok: false, reason: "Backup job is not complete." };
  }
  if (job.verificationStatus !== "verified") {
    return { ok: false, reason: "Backup verification has not passed." };
  }
  if (job.restoreValidationStatus !== "passed") {
    return { ok: false, reason: "Isolated restore validation has not passed." };
  }
  if (!job.manifestChecksumSha256) {
    return { ok: false, reason: "Backup manifest checksum is missing." };
  }
  if (!job.sourceEvidenceArtifactsVerified) {
    return { ok: false, reason: "Backup source evidence has not been artifact-verified." };
  }
  if (!job.artifacts?.length) {
    return { ok: false, reason: "Backup has no artifacts." };
  }
  if (!job.artifacts.some((a) => a.path.endsWith("manifest.json"))) {
    return { ok: false, reason: "Backup manifest artifact is missing." };
  }
  if (!job.sourceEvidence?.binding) {
    return { ok: false, reason: "Backup evidence binding is missing." };
  }
  if (job.sourceEvidence.firestore?.documentIntegrityVerified !== true) {
    return {
      ok: false,
      reason: "Full backup promotion requires verified Firestore document integrity.",
    };
  }

  const sourceCheck = validateTenantBackupSourceEvidence({
    evidence: job.sourceEvidence,
    artifacts: job.artifacts,
    gymId: job.gymId,
    backupId: job.backupId,
    backupJobId: job.sourceEvidence.binding.backupJobId,
    manifestChecksumSha256: job.manifestChecksumSha256,
    trustPriorArtifactVerification: true,
  });
  if (!sourceCheck.ok) {
    return sourceCheck;
  }

  return { ok: true };
}

export function fullBackupPromotionPatch(
  job: Pick<GymTenantBackupJobDoc, "manifestChecksumSha256" | "artifacts" | "sourceEvidence"> & {
    id: string;
  },
  artifactRefPrefix: string,
): Partial<GymDoc> {
  const mainArtifact = job.artifacts.find((a) => a.path.endsWith("manifest.json"));
  const verifiedAtIso = job.sourceEvidence?.binding?.backupVerifiedAt;
  return {
    backupStatus: "succeeded",
    backupScope: GYM_BACKUP_SCOPE_FULL,
    backupChecksum: job.manifestChecksumSha256 ?? null,
    backupArtifactRef: mainArtifact
      ? `${artifactRefPrefix}${mainArtifact.path}`
      : null,
    backupVerifiedAt: verifiedAtIso
      ? Timestamp.fromDate(new Date(verifiedAtIso))
      : Timestamp.now(),
    backupManifestChecksum: job.manifestChecksumSha256 ?? null,
    backupSourceEvidence: job.sourceEvidence ?? null,
    backupCompletedJobId: job.id,
    tenantFullBackupJobId: null,
  };
}