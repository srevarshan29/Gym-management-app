import type { GymDoc } from "@/lib/firestore/types";
import {
  GYM_DELETION_WAITING_PERIOD_MS,
  type GymDeletionMode,
  type GymPurgeStatus,
} from "@/lib/gym-lifecycle/deletion-types";
import { resolveGymLifecycleStatus } from "@/lib/gym-lifecycle/status";

export function isGymDeletionLocked(
  gym: Pick<
    GymDoc,
    "deletionMode" | "deletionLockedAt" | "purgeStatus"
  >,
): boolean {
  if (gym.deletionLockedAt) return true;
  if (gym.deletionMode === "immediate") return true;
  const status = gym.purgeStatus ?? "none";
  return (
    status === "purging" ||
    status === "ready" ||
    status === "backup_pending"
  );
}

export function canReactivateGym(
  gym: Pick<
    GymDoc,
    "status" | "deletionMode" | "deletionLockedAt" | "purgeStatus"
  > | null,
): { ok: true } | { ok: false; reason: string } {
  if (!gym) return { ok: false, reason: "Gym not found." };
  if (resolveGymLifecycleStatus(gym) === "active") {
    return { ok: false, reason: "This gym is already active." };
  }
  if (gym.deletionLockedAt) {
    return { ok: false, reason: "This gym is locked for immediate deletion." };
  }
  const purgeStatus = gym.purgeStatus ?? "none";
  if (purgeStatus === "purging" || purgeStatus === "ready") {
    return {
      ok: false,
      reason: "Purge has started or is ready; reactivation is not allowed.",
    };
  }
  if (gym.deletionMode === "immediate") {
    return { ok: false, reason: "Immediate deletion is in progress." };
  }
  return { ok: true };
}

export function isScheduledDeletionEligible(
  gym: Pick<GymDoc, "deletionMode" | "deletionEligibleAt" | "purgeStatus">,
  now: Date,
): boolean {
  if (gym.deletionMode !== "scheduled") return false;
  const eligible = gym.deletionEligibleAt?.toDate();
  if (!eligible) return false;
  if (eligible.getTime() > now.getTime()) return false;
  const status = gym.purgeStatus ?? "none";
  return status === "scheduled_pending" || status === "backup_pending";
}

export function hasPendingScheduledDeletion(
  gym: Pick<GymDoc, "deletionMode" | "purgeStatus">,
): boolean {
  if (gym.deletionMode !== "scheduled") return false;
  const status = gym.purgeStatus ?? "none";
  return status === "scheduled_pending" || status === "backup_pending";
}

export function deletionWaitingPeriodEndsAt(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + GYM_DELETION_WAITING_PERIOD_MS);
}

export function initialPurgeStatusForMode(
  mode: GymDeletionMode,
): GymPurgeStatus {
  return mode === "scheduled" ? "scheduled_pending" : "backup_pending";
}