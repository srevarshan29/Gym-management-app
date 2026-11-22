import { Timestamp } from "firebase-admin/firestore";

import { GYM_BACKUP_SCOPE_PREFLIGHT } from "@/lib/gym-lifecycle/backup/backup-scope";
import { validateTenantBackupStorageConfig } from "@/lib/gym-lifecycle/backup/config";
import { createSupabaseBackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";
import {
  canPromoteTenantFullBackup,
  fullBackupPromotionPatch,
} from "@/lib/gym-lifecycle/backup/full-backup-promotion";
import { isTenantFullBackupExportEnabled } from "@/lib/gym-lifecycle/backup/full-backup-config";
import {
  advanceTenantFullBackupStep,
  type TenantBackupRunnerDeps,
} from "@/lib/gym-lifecycle/backup/tenant-backup-runner";
import { getFirestoreDb, getRepositories, platformContext } from "@/lib/firestore";
import { newDocId } from "@/lib/firestore/helpers";
import { resolveGymLifecycleStatus } from "@/lib/gym-lifecycle/status";
import {
  resolveFullBackupExportDeps,
  resolveFullBackupExportDepsForTest,
} from "@/lib/gym-lifecycle/backup/backup-export-deps";
import type { BackupStorageAdapter } from "@/lib/gym-lifecycle/backup/backup-storage";
import type { FullBackupTestExportOverrides } from "@/lib/gym-lifecycle/backup/backup-export-deps";

export { resolveFullBackupExportDeps, resolveFullBackupExportDepsForTest };

export async function startFullTenantBackupJob(input: {
  gymId: string;
  actorUserId: string;
}): Promise<{ backupJobId: string; backupId: string }> {
  const { gyms, gymTenantBackupJobs, gymLifecycleAudit } = getRepositories();
  const gym = await gyms.getById(platformContext, input.gymId);
  if (!gym) throw new Error("Gym not found.");
  if (!gym.deletionMode) throw new Error("Deletion must be in progress.");
  if (resolveGymLifecycleStatus(gym) !== "deactivated") {
    throw new Error("Gym must be deactivated before full backup.");
  }

  const backupJobId = newDocId();
  const backupId = newDocId();
  await gymTenantBackupJobs.create({
    id: backupJobId,
    gymId: input.gymId,
    deletionJobId: gym.purgeJobId ?? null,
    backupId,
  });

  await gyms.patchLifecycle(platformContext, input.gymId, {
    tenantFullBackupJobId: backupJobId,
    backupStatus: "pending",
    backupScope: GYM_BACKUP_SCOPE_PREFLIGHT,
  });

  await gymLifecycleAudit.append({
    gymId: input.gymId,
    event: "backup_started",
    actorUserId: input.actorUserId,
    details: { mode: "full", backupJobId, backupId },
  });

  return { backupJobId, backupId };
}

export async function advanceFullTenantBackupJob(input: {
  gymId: string;
  actorUserId: string;
  storage?: BackupStorageAdapter;
  /** Test-only — ignored when production export I/O is enabled. */
  testOverrides?: FullBackupTestExportOverrides;
  allowProductionIO?: boolean;
}) {
  const { gyms, gymTenantBackupJobs, gymLifecycleAudit } = getRepositories();
  const gym = await gyms.getById(platformContext, input.gymId);
  if (!gym?.tenantFullBackupJobId) throw new Error("No full backup job for this gym.");

  const job = await gymTenantBackupJobs.getById(gym.tenantFullBackupJobId);
  if (!job) throw new Error("Backup job not found.");
  if (job.gymId !== input.gymId) throw new Error("Backup job gym mismatch.");

  const allowProductionIO = input.allowProductionIO ?? isTenantFullBackupExportEnabled();
  const storage =
    input.storage ??
    (allowProductionIO ? await createSupabaseBackupStorageAdapter() : undefined);
  if (!storage) {
    throw new Error("Full backup export is disabled. Set ALLOW_TENANT_FULL_BACKUP_EXPORT for server export.");
  }

  const exportDeps = await resolveFullBackupExportDeps({
    gymId: gym.id,
    allowProductionIO,
    testOverrides: allowProductionIO ? undefined : input.testOverrides,
  });

  const deps: TenantBackupRunnerDeps = {
    db: getFirestoreDb(),
    storage,
    postgres: exportDeps.postgres,
    supabase: exportDeps.supabase,
    gymName: gym.name,
    gymId: gym.id,
    deletionJobId: job.deletionJobId,
    backupId: job.backupId,
    jobId: job.id,
    actorUserId: input.actorUserId,
    allowProductionIO,
  };

  const result = await advanceTenantFullBackupStep(job, deps);

  if (result.status === "completed") {
    const refreshed = await gymTenantBackupJobs.getById(job.id);
    if (!refreshed) throw new Error("Backup job missing after completion.");
    const promotion = canPromoteTenantFullBackup(gym, refreshed);
    if (promotion.ok) {
      const bucket = validateTenantBackupStorageConfig();
      const prefix = bucket.ok ? `supabase://${bucket.config.bucket}/` : "memory://";
      await gyms.patchLifecycle(platformContext, input.gymId, {
        ...fullBackupPromotionPatch({ ...refreshed, id: job.id }, prefix),
      });
      if (gym.purgeJobId) {
        const { gymDeletionJobs } = getRepositories();
        await gymDeletionJobs.patch(gym.purgeJobId, {
          backupChecksum: refreshed.manifestChecksumSha256,
          backupArtifactRef: `${prefix}tenant-backups/${gym.id}/${job.backupId}/manifest.json`,
        });
      }
      await gymLifecycleAudit.append({
        gymId: input.gymId,
        event: "backup_succeeded",
        actorUserId: input.actorUserId,
        details: {
          mode: "full",
          manifestChecksum: refreshed.manifestChecksumSha256,
          backupJobId: job.id,
        },
      });
    }
  }

  if (result.status === "failed") {
    await gyms.patchLifecycle(platformContext, input.gymId, {
      backupStatus: "failed",
      backupScope: GYM_BACKUP_SCOPE_PREFLIGHT,
    });
    await gymLifecycleAudit.append({
      gymId: input.gymId,
      event: "backup_failed",
      actorUserId: input.actorUserId,
      details: { mode: "full", error: result.error },
    });
  }

  return result;
}