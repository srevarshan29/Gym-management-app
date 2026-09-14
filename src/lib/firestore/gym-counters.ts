import type { GymsRepository } from "@/lib/firestore/repositories/gyms";
import type { GymDashboardCounters } from "@/lib/firestore/types";

export type GymCounterField = keyof Omit<
  GymDashboardCounters,
  "countersUpdatedAt"
>;

/** Atomically adjust a denormalized gym dashboard counter (no-op when delta is 0). */
export async function adjustGymCounter(
  gyms: GymsRepository,
  gymId: string,
  field: GymCounterField,
  delta: number,
): Promise<void> {
  if (delta === 0) return;
  await gyms.incrementDashboardCounter(gymId, field, delta);
}

/** Phase 3 counter fields — updated alongside domain writes in Steps 2–6. */
export const PHASE3_GYM_COUNTERS = [
  "pendingWalkInVisitors",
  "employeeCount",
  "eventCount",
  "dietPlanCount",
  "workoutPlanCount",
  "ptMemberCount",
] as const satisfies readonly GymCounterField[];

export type Phase3GymCounter = (typeof PHASE3_GYM_COUNTERS)[number];
