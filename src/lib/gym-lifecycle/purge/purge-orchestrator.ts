import { Timestamp } from "firebase-admin/firestore";

import { prepareVerifiedFinancialArchive } from "@/lib/gym-lifecycle/financial-archive-service";
import { exportGymFinancialRecords } from "@/lib/gym-lifecycle/financial-export";
import { initialPurgeProgress } from "@/lib/gym-lifecycle/purge/purge-guards";
import {
  assertPurgeAuthority,
  evaluatePurgeAuthority,
} from "@/lib/gym-lifecycle/purge/purge-authority";
import { loadPurgeOperationContext } from "@/lib/gym-lifecycle/purge/purge-context";
import { buildGymTenantInventory } from "@/lib/gym-lifecycle/purge/inventory-builder";
import { deleteFirestoreTenantDocumentsPage } from "@/lib/gym-lifecycle/purge/firestore-tenant-delete";
import { gymSupabaseStoragePrefix } from "@/lib/gym-lifecycle/purge/inventory";
import {
  acquirePurgeJobLease,
  commitPurgeProgressWithLease,
  releasePurgeJobLease,
} from "@/lib/gym-lifecycle/purge/purge-job-lease";
import { runPurgePhase, type PurgeRunnerDeps } from "@/lib/gym-lifecycle/purge/runner";
import { getFirestoreDb, getRepositories, platformContext } from "@/lib/firestore";
import type { GymPurgeProgress } from "@/lib/firestore/types";
import { isTenantPurgeDestructionEnabled } from "@/lib/gym-lifecycle/purge/config";

export type PurgeSimulationReport = {
  destructivePurgeEnabled: boolean;
  authority: ReturnType<typeof evaluatePurgeAuthority>;
  currentPhase: GymPurgeProgress;
  message: string;
};

export type PurgeStepResult =
  | { status: "simulation"; report: PurgeSimulationReport }
  | { status: "completed" | "advanced" | "failed" | "cancelled"; error?: string };

async function archiveGymFinancialRecordsDuringPurge(gymId: string, gymName: string, artifactRef: string | null) {
  const db = getFirestoreDb();
  const { gymFinancialArchives } = getRepositories();
  const financial = await exportGymFinancialRecords(db, gymId);
  const retentionPolicyConfigured = Boolean(process.env.GYM_FINANCIAL_RETENTION_POLICY?.trim());

  const policyComplete = retentionPolicyConfigured;

  await gymFinancialArchives.upsertArchive({
    gymId,
    gymName,
    payments: financial.payments,
    receipts: financial.receipts,
    ledgerTransactions: financial.ledgerTransactions,
    subscriptions: financial.subscriptions,
    backupArtifactRef: artifactRef,
    retentionPolicyConfigured,
    financialArchiveStatus: policyComplete ? "complete" : "incomplete",
    financialArchiveVerifiedAt: policyComplete ? new Date() : null,
  });
}

export function buildPurgeRunnerDeps(gymId: string, destructive: boolean): PurgeRunnerDeps {
  const db = getFirestoreDb();
  return {
    gymId,
    dryRun: !destructive,
    inventory: () => buildGymTenantInventory(db, gymId),
    archiveFinancialRecords: async () => {
      const { gyms } = getRepositories();
      const gym = await gyms.getById(platformContext, gymId);
      await archiveGymFinancialRecordsDuringPurge(
        gymId,
        gym?.name ?? gymId,
        gym?.backupArtifactRef ?? null,
      );
    },
    deleteFirestoreTenantBatch: (input) =>
      deleteFirestoreTenantDocumentsPage(db, { ...input, gymId }),
    deleteSupabaseTenantPrefix: async () => {
      const prefix = gymSupabaseStoragePrefix(gymId);
      const { deleteSupabaseStoragePrefix } = await import(
        "@/lib/gym-lifecycle/purge/supabase-tenant-delete"
      );
      await deleteSupabaseStoragePrefix(prefix);
    },
    deletePostgresTenant: async () => {
      const { deletePostgresTenantRecords } = await import(
        "@/lib/gym-lifecycle/purge/postgres-tenant-delete"
      );
      await deletePostgresTenantRecords(gymId);
    },
    deleteGymRootDocuments: async () => {
      const { COLLECTIONS } = await import("@/lib/firestore/collections");
      await db.collection(COLLECTIONS.gymProfiles).doc(gymId).delete();
      await db.collection(COLLECTIONS.gyms).doc(gymId).delete();
    },
  };
}

function simulationReport(
  ctx: NonNullable<Awaited<ReturnType<typeof loadPurgeOperationContext>>>,
  now: Date,
): PurgeSimulationReport {
  const authority = evaluatePurgeAuthority({
    gym: ctx.gym,
    job: ctx.job,
    archive: ctx.archive,
    now,
  });

  const progress = ctx.gym.purgeProgress ?? ctx.job?.progress ?? initialPurgeProgress();

  return {
    destructivePurgeEnabled: isTenantPurgeDestructionEnabled(),
    authority,
    currentPhase: progress,
    message: isTenantPurgeDestructionEnabled()
      ? "Destructive purge is enabled but authority checks must pass before any write."
      : "Simulation only — ALLOW_TENANT_GYM_PURGE is not enabled; no lifecycle progress will be persisted.",
  };
}

export async function simulateGymPurgeStep(input: {
  gymId: string;
  now?: Date;
}): Promise<PurgeSimulationReport> {
  const ctx = await loadPurgeOperationContext(input.gymId);
  if (!ctx) {
    return {
      destructivePurgeEnabled: isTenantPurgeDestructionEnabled(),
      authority: evaluatePurgeAuthority({
        gym: null,
        job: null,
        archive: null,
        now: input.now ?? new Date(),
      }),
      currentPhase: initialPurgeProgress(),
      message: "Gym not found.",
    };
  }
  return simulationReport(ctx, input.now ?? new Date());
}

export async function advanceGymPurgeStep(input: {
  gymId: string;
  actorUserId: string;
  now?: Date;
}): Promise<PurgeStepResult> {
  const now = input.now ?? new Date();
  const destructive = isTenantPurgeDestructionEnabled();

  if (!destructive) {
    const report = await simulateGymPurgeStep({ gymId: input.gymId, now });
    return { status: "simulation", report };
  }

  const ctx = await loadPurgeOperationContext(input.gymId);
  if (!ctx?.job) {
    throw new Error("Deletion job not found for this gym.");
  }

  assertPurgeAuthority({
    gym: ctx.gym,
    job: ctx.job,
    archive: ctx.archive,
    now,
  });

  const purgeStatus = ctx.gym.purgeStatus ?? "none";
  if (purgeStatus === "cancelled" || purgeStatus === "completed") {
    return { status: purgeStatus };
  }
  if (purgeStatus !== "ready" && purgeStatus !== "purging" && purgeStatus !== "failed") {
    throw new Error(`Purge cannot run while status is ${purgeStatus}.`);
  }

  const db = getFirestoreDb();
  const lease = await acquirePurgeJobLease(db, ctx.job.id, input.actorUserId, now.getTime());
  if (!lease.acquired) {
    throw new Error(lease.reason);
  }

  const progress: GymPurgeProgress =
    ctx.gym.purgeProgress ?? ctx.job.progress ?? initialPurgeProgress();

  const { gyms, gymDeletionJobs, gymLifecycleAudit } = getRepositories();

  try {
    await gyms.patchLifecycle(platformContext, input.gymId, {
      purgeStatus: "purging",
      purgeStartedAt: ctx.gym.purgeStartedAt ?? Timestamp.now(),
    });

    const result = await runPurgePhase(progress, buildPurgeRunnerDeps(input.gymId, true));

    if (result.status === "failed") {
      await gyms.patchLifecycle(platformContext, input.gymId, {
        purgeStatus: "failed",
        purgeError: result.error,
        purgeProgress: progress,
      });
      await gymDeletionJobs.patch(ctx.job.id, {
        purgeStatus: "failed",
        purgeError: result.error,
      });
      await gymLifecycleAudit.append({
        gymId: input.gymId,
        event: "purge_failed",
        actorUserId: input.actorUserId,
        details: { error: result.error },
      });
      return { status: "failed", error: result.error };
    }

    if (result.status === "completed") {
      const committed = await commitPurgeProgressWithLease(db, {
        jobId: ctx.job.id,
        leaseOwner: input.actorUserId,
        expected: progress,
        next: result.progress,
        batchSucceeded: true,
      });
      if (!committed.committed) {
        throw new Error(committed.reason ?? "Could not commit final purge progress.");
      }
      await gyms.patchLifecycle(platformContext, input.gymId, {
        purgeStatus: "completed",
        purgeCompletedAt: Timestamp.now(),
        purgeProgress: result.progress,
        purgeError: null,
      });
      await gymDeletionJobs.patch(ctx.job.id, {
        purgeStatus: "completed",
        progress: result.progress,
        purgeError: null,
      });
      await gymLifecycleAudit.append({
        gymId: input.gymId,
        event: "purge_completed",
        actorUserId: input.actorUserId,
        details: null,
      });
      return { status: "completed" };
    }

    const committed = await commitPurgeProgressWithLease(db, {
      jobId: ctx.job.id,
      leaseOwner: input.actorUserId,
      expected: progress,
      next: result.progress,
      batchSucceeded: true,
    });
    if (!committed.committed) {
      throw new Error(committed.reason ?? "Progress was not committed.");
    }

    await gyms.patchLifecycle(platformContext, input.gymId, {
      purgeStatus: "purging",
      purgeProgress: result.progress,
    });
    await gymDeletionJobs.patch(ctx.job.id, {
      purgeStatus: "purging",
      progress: result.progress,
    });
    await gymLifecycleAudit.append({
      gymId: input.gymId,
      event: "purge_phase_advanced",
      actorUserId: input.actorUserId,
      details: { phase: result.progress.phase, cursor: result.progress.cursor ?? null },
    });

    return { status: "advanced" };
  } finally {
    await releasePurgeJobLease(db, ctx.job.id, input.actorUserId);
  }
}