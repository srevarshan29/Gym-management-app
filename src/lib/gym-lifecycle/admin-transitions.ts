import { canReactivateGym } from "@/lib/gym-lifecycle/deletion-policy";
import { resolveGymLifecycleStatus, type GymLifecycleStatus } from "@/lib/gym-lifecycle/status";
import type { GymDoc } from "@/lib/firestore/types";

export type GymLifecycleTransitionResult =
  | { ok: true; from: GymLifecycleStatus; to: GymLifecycleStatus }
  | { ok: false; error: string };

export function validateGymDeactivateTransition(
  gym: Pick<GymDoc, "status"> | null,
  gymId: string,
): GymLifecycleTransitionResult {
  if (!gym) {
    return { ok: false, error: `Gym not found (${gymId}).` };
  }
  const from = resolveGymLifecycleStatus(gym);
  if (from === "deactivated") {
    return { ok: false, error: "This gym is already deactivated." };
  }
  return { ok: true, from, to: "deactivated" };
}

export function validateGymReactivateTransition(
  gym: Pick<
    GymDoc,
    "status" | "deletionMode" | "deletionLockedAt" | "purgeStatus"
  > | null,
  gymId: string,
): GymLifecycleTransitionResult {
  if (!gym) {
    return { ok: false, error: `Gym not found (${gymId}).` };
  }
  const from = resolveGymLifecycleStatus(gym);
  if (from === "active") {
    return { ok: false, error: "This gym is already active." };
  }
  const reactivate = canReactivateGym(gym);
  if (!reactivate.ok) {
    return { ok: false, error: reactivate.reason };
  }
  return { ok: true, from, to: "active" };
}