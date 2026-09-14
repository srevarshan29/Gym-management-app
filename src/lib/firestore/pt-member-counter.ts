import { adjustGymCounter } from "@/lib/firestore/gym-counters";
import { getRepositories } from "@/lib/firestore";

/** Apply delta to `ptMemberCount` (no-op when delta is 0). */
export async function adjustPtMemberCounter(
  gymId: string,
  delta: number,
): Promise<void> {
  if (delta === 0) return;
  const { gyms } = getRepositories();
  await adjustGymCounter(gyms, gymId, "ptMemberCount", delta);
}

export function ptMemberCounterDelta(wasPt: boolean, isPt: boolean): number {
  if (wasPt === isPt) return 0;
  return isPt ? 1 : -1;
}
