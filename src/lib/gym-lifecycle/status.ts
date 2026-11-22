import type { GymDoc } from "@/lib/firestore/types";

export type GymLifecycleStatus = "active" | "deactivated";

/** Legacy gyms without `status` are treated as active. */
export function resolveGymLifecycleStatus(
  gym: Pick<GymDoc, "status"> | null | undefined,
): GymLifecycleStatus {
  if (!gym?.status || gym.status === "active") {
    return "active";
  }
  if (gym.status === "deactivated") {
    return "deactivated";
  }
  return "active";
}

export function isGymAccessAllowed(
  status: GymLifecycleStatus,
): boolean {
  return status === "active";
}

export function gymAllowsTenantAccess(gym: Pick<GymDoc, "status"> | null | undefined): boolean {
  return isGymAccessAllowed(resolveGymLifecycleStatus(gym));
}