import { Timestamp } from "firebase-admin/firestore";

import {
  verifyTenantBackupChecksum,
} from "@/lib/gym-lifecycle/backup/tenant-backup";
import {
  canReactivateGym,
  deletionWaitingPeriodEndsAt,
  initialPurgeStatusForMode,
} from "@/lib/gym-lifecycle/deletion-policy";
import {
  GYM_DELETION_WAITING_PERIOD_MS,
  type GymDeletionMode,
} from "@/lib/gym-lifecycle/deletion-types";
import { prepareVerifiedFinancialArchive } from "@/lib/gym-lifecycle/financial-archive-service";
import { assertPurgeAuthority } from "@/lib/gym-lifecycle/purge/purge-authority";
import { assertExportRateLimit } from "@/lib/gym-lifecycle/export/export-rate-limit";
import { runOptionalGymDataExport } from "@/lib/gym-lifecycle/export/gym-data-export";
import { loadPurgeOperationContext } from "@/lib/gym-lifecycle/purge/purge-context";
import { initialPurgeProgress } from "@/lib/gym-lifecycle/purge-guards";
import { newDocId } from "@/lib/firestore/helpers";
import type { GymDoc } from "@/lib/firestore/types";
import { getRepositories, platformContext } from "@/lib/firestore";

export { GYM_DELETION_WAITING_PERIOD_MS };

export type ScheduleDeletionInput = {
  gymId: string;
  actorUserId: string;
};

export type ImmediateDeletionInput = {
  gymId: string;
  actorUserId: string;
};

export async function scheduleGymDeletion(input: ScheduleDeletionInput): Promise<void> {
  const { gyms, users, gymDeletionJobs, gymLifecycleAudit } = getExtendedRepositories();
  const gym = await gyms.getById(platformContext, input.gymId);
  if (!gym) throw new Error("Gym not found.");

  const purgeStatus = gym.purgeStatus ?? "none";
  if (gym.deletionMode || purgeStatus !== "none") {
    throw new Error("A deletion request is already in progress for this gym.");
  }

  const requestedAt = new Date();
  const eligibleAt = deletionWaitingPeriodEndsAt(requestedAt);
  const jobId = newDocId();
  const newToken = newDocId();

  await gymDeletionJobs.create({
    id: jobId,
    gymId: input.gymId,
    gymName: gym.name,
    deletionMode: "scheduled",
    purgeStatus: "scheduled_pending",
    requestedByUserId: input.actorUserId,
    requestedAt,
    eligibleAt,
    lockedAt: null,
  });

  const now = Timestamp.now();
  await gyms.patchLifecycle(platformContext, input.gymId, {
    status: "deactivated",
    deactivatedAt: gym.deactivatedAt ?? now,
    deactivatedByUserId: gym.deactivatedByUserId ?? input.actorUserId,
    registrationToken: newToken,
    deletionMode: "scheduled",
    deletionRequestedAt: Timestamp.fromDate(requestedAt),
    deletionRequestedByUserId: input.actorUserId,
    deletionEligibleAt: Timestamp.fromDate(eligibleAt),
    deletionLockedAt: null,
    purgeStatus: initialPurgeStatusForMode("scheduled"),
    purgeJobId: jobId,
    purgeError: null,
    purgeProgress: null,
  });

  await users.bumpCredentialsVersionForGym(platformContext, input.gymId);
  await gymLifecycleAudit.append({
    gymId: input.gymId,
    event: "deletion_scheduled",
    actorUserId: input.actorUserId,
    details: { jobId, eligibleAt: eligibleAt.toISOString() },
  });
  await gymLifecycleAudit.append({
    gymId: input.gymId,
    event: "registration_token_rotated",
    actorUserId: input.actorUserId,
    details: { reason: "deletion_scheduled" },
  });
}

export async function requestImmediateGymDeletion(_input: ImmediateDeletionInput): Promise<void> {
  throw new Error(
    "Immediate deletion is not supported. Schedule deletion for the 30-day recovery period instead.",
  );
}

export async function cancelScheduledDeletionOnReactivate(input: {
  gymId: string;
  actorUserId: string;
}): Promise<void> {
  const { gyms, gymDeletionJobs, gymLifecycleAudit } = getExtendedRepositories();
  const gym = await gyms.getById(platformContext, input.gymId);
  if (!gym) throw new Error("Gym not found.");

  const reactivate = canReactivateGym(gym);
  if (!reactivate.ok) throw new Error(reactivate.reason);

  const newToken = newDocId();
  if (gym.purgeJobId) {
    await gymDeletionJobs.patch(gym.purgeJobId, { purgeStatus: "cancelled" });
  }

  await gyms.patchLifecycle(platformContext, input.gymId, {
    status: "active",
    deactivatedAt: null,
    deactivatedByUserId: null,
    registrationToken: newToken,
    deletionMode: null,
    deletionRequestedAt: null,
    deletionRequestedByUserId: null,
    deletionEligibleAt: null,
    deletionLockedAt: null,
    purgeStatus: "none",
    backupStatus: undefined,
    backupArtifactRef: null,
    backupChecksum: null,
    backupSizeBytes: null,
    backupCreatedAt: null,
    purgeJobId: null,
    purgeStartedAt: null,
    purgeCompletedAt: null,
    purgeProgress: null,
    purgeError: null,
  });

  await gymLifecycleAudit.append({
    gymId: input.gymId,
    event: "deletion_cancelled",
    actorUserId: input.actorUserId,
    details: { via: "reactivation" },
  });
  await gymLifecycleAudit.append({
    gymId: input.gymId,
    event: "reactivated",
    actorUserId: input.actorUserId,
    details: null,
  });
  await gymLifecycleAudit.append({
    gymId: input.gymId,
    event: "registration_token_rotated",
    actorUserId: input.actorUserId,
    details: { reason: "reactivation" },
  });

  const { users } = getExtendedRepositories();
  await users.bumpCredentialsVersionForGym(platformContext, input.gymId);
}

export async function runOptionalGymDataExportForGym(input: {
  gymId: string;
  actorUserId: string;
  writer?: { write(objectPath: string, body: Buffer): Promise<void> };
}): Promise<{
  exportId: string;
  artifactExpiresAt: string;
  complete: boolean;
  completeness: import("@/lib/gym-lifecycle/export/export-manifest").GymDataExportCompleteness;
}> {
  const { gyms, gymDeletionJobs, gymLifecycleAudit } = getExtendedRepositories();
  const gym = await gyms.getById(platformContext, input.gymId);
  if (!gym) throw new Error("Gym not found.");
  if (!gym.deletionMode) {
    throw new Error("Optional export is available during the deletion waiting period.");
  }

  const rate = await assertExportRateLimit({
    kind: "export_run",
    scopeId: input.gymId,
  });
  if (!rate.ok) throw new Error(rate.error);

  await gymLifecycleAudit.append({
    gymId: input.gymId,
    event: "data_export_started",
    actorUserId: input.actorUserId,
    details: null,
  });

  await gyms.patchLifecycle(platformContext, input.gymId, {
    dataExportStatus: "pending",
  });

  const result = await runOptionalGymDataExport({
    gymId: input.gymId,
    writer: input.writer,
  });

  if (!result.ok) {
    await gyms.patchLifecycle(platformContext, input.gymId, {
      dataExportStatus: "failed",
      purgeError: result.error,
    });
    await gymLifecycleAudit.append({
      gymId: input.gymId,
      event: "data_export_failed",
      actorUserId: input.actorUserId,
      details: { error: result.error },
    });
    throw new Error(result.error);
  }

  const now = Timestamp.now();
  await gyms.patchLifecycle(platformContext, input.gymId, {
    dataExportStatus: "ready",
    dataExportId: result.exportId,
    dataExportComplete: result.complete,
    dataExportCompleteness: result.completeness,
    dataExportArtifactRef: result.artifactPath,
    dataExportChecksum: result.checksumSha256,
    dataExportSizeBytes: result.sizeBytes,
    dataExportReadyAt: now,
    dataExportDownloadExpiresAt: Timestamp.fromDate(new Date(result.artifactExpiresAt)),
  });

  if (gym.purgeJobId) {
    await gymDeletionJobs.patch(gym.purgeJobId, {
      backupArtifactRef: result.artifactPath,
      backupChecksum: result.checksumSha256,
    });
  }

  await gymLifecycleAudit.append({
    gymId: input.gymId,
    event: "data_export_succeeded",
    actorUserId: input.actorUserId,
    details: {
      exportId: result.exportId,
      artifactPath: result.artifactPath,
      checksum: result.checksumSha256,
      complete: result.complete,
      completeness: result.completeness,
      artifactExpiresAt: result.artifactExpiresAt,
    },
  });

  return {
    exportId: result.exportId,
    artifactExpiresAt: result.artifactExpiresAt,
    complete: result.complete,
    completeness: result.completeness,
  };
}

export {
  assertBackupVerifiedForPurge,
  initialPurgeProgress,
} from "@/lib/gym-lifecycle/purge-guards";

export async function confirmGymPurgeReady(input: {
  gymId: string;
  actorUserId: string;
  now?: Date;
}): Promise<void> {
  const { gyms, gymDeletionJobs, gymLifecycleAudit } = getExtendedRepositories();
  const gym = await gyms.getById(platformContext, input.gymId);
  if (!gym) throw new Error("Gym not found.");
  if (!gym.deletionMode) throw new Error("No deletion request for this gym.");
  if (!gym.purgeJobId) throw new Error("No deletion job is bound to this gym.");

  const now = input.now ?? new Date();

  await prepareVerifiedFinancialArchive(input.gymId);

  const ctx = await loadPurgeOperationContext(input.gymId);
  if (!ctx?.job || ctx.job.id !== gym.purgeJobId) {
    throw new Error("Deletion job binding is invalid.");
  }

  assertPurgeAuthority({
    gym: ctx.gym,
    job: ctx.job,
    archive: ctx.archive,
    now,
  });

  await gymDeletionJobs.recordPurgeConfirmation(ctx.job.id, {
    gymId: input.gymId,
    actorUserId: input.actorUserId,
    deletionMode: gym.deletionMode,
  });

  const progress = initialPurgeProgress();
  await gyms.patchLifecycle(platformContext, input.gymId, {
    purgeStatus: "ready",
    purgeProgress: progress,
  });

  await gymDeletionJobs.patch(gym.purgeJobId, {
    purgeStatus: "ready",
    progress,
  });

  await gymLifecycleAudit.append({
    gymId: input.gymId,
    event: "purge_confirmed",
    actorUserId: input.actorUserId,
    details: {
      deletionMode: gym.deletionMode,
      jobId: gym.purgeJobId,
    },
  });
}

export function verifyBackupChecksumFromBody(body: Buffer, gym: Pick<GymDoc, "backupChecksum">): boolean {
  if (!gym.backupChecksum) return false;
  return verifyTenantBackupChecksum(body, gym.backupChecksum);
}

function getExtendedRepositories() {
  return getRepositories();
}

export function deletionModeLabel(mode: GymDeletionMode | null | undefined): string {
  if (mode === "scheduled") return "Scheduled (30-day waiting period)";
  if (mode === "immediate") return "Immediate";
  return "None";
}