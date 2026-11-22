import {
  hasPendingScheduledDeletion,
  isGymDeletionLocked,
} from "@/lib/gym-lifecycle/deletion-policy";
import { resolveGymLifecycleStatus } from "@/lib/gym-lifecycle/status";
import type { GymDoc } from "@/lib/firestore/types";

export type TenantWritePolicyResult =
  | { allowed: true }
  | { allowed: false; reason: string; code: "deactivated" | "deletion_locked" | "purge_active" };

/**
 * Minimum policy for tenant-facing mutations during deletion lifecycle.
 * Not a complete write gate — see TENANT_WRITE_PATH_AUDIT.md for uncovered paths.
 */
export function evaluateTenantWritePolicy(
  gym: Pick<
    GymDoc,
    "status" | "deletionMode" | "deletionLockedAt" | "purgeStatus" | "tenantFullBackupJobId"
  > | null,
): TenantWritePolicyResult {
  if (!gym) {
    return { allowed: false, reason: "Gym not found.", code: "deactivated" };
  }
  if (resolveGymLifecycleStatus(gym) !== "active") {
    return {
      allowed: false,
      reason: "Gym is deactivated; tenant mutations are blocked.",
      code: "deactivated",
    };
  }
  if (gym.deletionMode) {
    return {
      allowed: false,
      reason: `Gym has an active ${gym.deletionMode} deletion request; tenant mutations are blocked.`,
      code: "deletion_locked",
    };
  }
  if (hasPendingScheduledDeletion(gym)) {
    return {
      allowed: false,
      reason: "Scheduled deletion is pending; tenant mutations are blocked.",
      code: "deletion_locked",
    };
  }
  if (isGymDeletionLocked(gym)) {
    return {
      allowed: false,
      reason: "Gym is locked for deletion; new tenant writes are blocked.",
      code: "deletion_locked",
    };
  }
  const purge = gym.purgeStatus ?? "none";
  if (purge === "purging" || purge === "backup_pending") {
    return {
      allowed: false,
      reason: "Purge or backup preparation is active; tenant writes are blocked.",
      code: "purge_active",
    };
  }
  return { allowed: true };
}