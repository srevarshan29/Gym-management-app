import type { Timestamp } from "firebase-admin/firestore";

import { evaluateFinancialArchiveCompleteness } from "@/lib/gym-lifecycle/financial-archive-verify";
import { evaluateTenantWriteCoverageForPurge } from "@/lib/gym-lifecycle/tenant-write-audit";
import { resolveGymLifecycleStatus } from "@/lib/gym-lifecycle/status";
import type { GymDeletionJobDoc } from "@/lib/firestore/repositories/gym-deletion-jobs";
import type { GymFinancialArchiveDoc } from "@/lib/firestore/repositories/gym-financial-archives";
import type { GymDeletionMode, GymDoc, GymPurgeStatus } from "@/lib/firestore/types";

export type PurgeAuthorityCheck =
  | "gym_exists"
  | "gym_deactivated"
  | "deletion_mode"
  | "not_cancelled"
  | "job_bound"
  | "scheduled_eligibility"
  | "purge_confirmed"
  | "financial_archive"
  | "job_incomplete"
  | "tenant_write_coverage"
  | "no_immediate_bypass";

export type PurgeAuthorityResult = {
  ok: boolean;
  checks: Record<PurgeAuthorityCheck, { ok: boolean; detail?: string }>;
  failures: string[];
};

function tsMillis(value: Timestamp | null | undefined): number | null {
  return value?.toMillis() ?? null;
}

/**
 * Purge authority for permanent tenant deletion.
 * Optional data export is never used as authorization input.
 */
export function evaluatePurgeAuthority(input: {
  gym: (GymDoc & { id: string }) | null;
  job: (GymDeletionJobDoc & { id: string }) | null;
  archive: (GymFinancialArchiveDoc & { id: string }) | null;
  now: Date;
}): PurgeAuthorityResult {
  const checks = {} as PurgeAuthorityResult["checks"];
  const failures: string[] = [];

  const record = (key: PurgeAuthorityCheck, ok: boolean, detail?: string) => {
    checks[key] = { ok, ...(detail ? { detail } : {}) };
    if (!ok && detail) failures.push(detail);
  };

  if (!input.gym) {
    record("gym_exists", false, "Gym not found.");
    return { ok: false, checks, failures };
  }
  record("gym_exists", true);

  const lifecycle = resolveGymLifecycleStatus(input.gym);
  const deactivated = lifecycle === "deactivated";
  record(
    "gym_deactivated",
    deactivated,
    deactivated ? undefined : "Gym must be deactivated before purge.",
  );

  const mode = input.gym.deletionMode;
  const modeOk = mode === "scheduled";
  record(
    "deletion_mode",
    modeOk,
    modeOk ? undefined : "Only scheduled deletion (30-day waiting period) may authorize purge.",
  );

  record(
    "no_immediate_bypass",
    mode !== "immediate",
    mode === "immediate"
      ? "Immediate deletion cannot bypass the waiting period."
      : undefined,
  );

  const job = input.job;
  const purgeStatus: GymPurgeStatus = input.gym.purgeStatus ?? "none";
  const cancelled =
    purgeStatus === "cancelled" ||
    purgeStatus === "none" ||
    purgeStatus === "completed" ||
    !mode ||
    job?.purgeStatus === "cancelled";
  record(
    "not_cancelled",
    !cancelled,
    cancelled ? "Deletion is cancelled, complete, or not active." : undefined,
  );

  const jobBound =
    Boolean(job) &&
    Boolean(input.gym.purgeJobId) &&
    job!.id === input.gym.purgeJobId &&
    job!.gymId === input.gym.id &&
    job!.deletionMode === mode;
  record(
    "job_bound",
    jobBound,
    jobBound ? undefined : "Deletion job is missing or does not match this gym.",
  );

  const eligibleAt = input.gym.deletionEligibleAt?.toDate();
  const eligible = Boolean(eligibleAt && eligibleAt.getTime() <= input.now.getTime());
  record(
    "scheduled_eligibility",
    eligible,
    eligible ? undefined : "Scheduled deletion has not reached its eligibility date.",
  );

  const confirmed =
    Boolean(job?.purgeConfirmedAt) &&
    Boolean(job?.purgeConfirmedByUserId) &&
    job?.purgeStatus !== "cancelled";
  record(
    "purge_confirmed",
    confirmed,
    confirmed
      ? undefined
      : "Final purge confirmation is not recorded on the deletion job.",
  );

  const writeCoverage = evaluateTenantWriteCoverageForPurge();
  record(
    "tenant_write_coverage",
    writeCoverage.ok,
    writeCoverage.ok ? undefined : writeCoverage.reason,
  );

  const financial = evaluateFinancialArchiveCompleteness(input.archive);
  record(
    "financial_archive",
    financial.ok,
    financial.ok ? undefined : "reason" in financial ? financial.reason : "Financial archive incomplete.",
  );

  const jobIncomplete = job != null && job.purgeStatus !== "completed" && job.purgeStatus !== "cancelled";
  record(
    "job_incomplete",
    jobIncomplete,
    jobIncomplete ? undefined : "Deletion job is already complete or cancelled.",
  );

  const ok = failures.length === 0;
  return { ok, checks, failures };
}

export function assertPurgeAuthority(input: Parameters<typeof evaluatePurgeAuthority>[0]): void {
  const result = evaluatePurgeAuthority(input);
  if (!result.ok) {
    throw new Error(result.failures[0] ?? "Purge authority checks failed.");
  }
}

/** @deprecated Backup is not required for purge in 27B.3A+. */
export function rejectPreflightBackupForDestructivePurge(): void {
  return;
}