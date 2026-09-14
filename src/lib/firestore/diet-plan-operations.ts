import { adjustGymCounter } from "@/lib/firestore/gym-counters";
import { newDocId, platformContext } from "@/lib/firestore/helpers";
import { getRepositories } from "@/lib/firestore";
import type { CreateDietPlanInput } from "@/lib/firestore/repositories/diet-plans";

export async function createDietPlanRecord(
  gymId: string,
  input: CreateDietPlanInput,
) {
  const { dietPlans, gyms } = getRepositories();
  const existing = await dietPlans.findByMemberId(
    platformContext,
    gymId,
    input.memberId,
  );
  if (existing) {
    return { created: false as const, plan: existing };
  }

  const id = newDocId();
  const plan = await dietPlans.createPlan(platformContext, gymId, id, input);
  await adjustGymCounter(gyms, gymId, "dietPlanCount", 1);
  return { created: true as const, plan };
}

export async function deleteDietPlanRecord(
  gymId: string,
  id: string,
): Promise<boolean> {
  const { dietPlans, gyms } = getRepositories();
  const doc = await dietPlans.getById(platformContext, gymId, id);
  if (!doc) return false;

  await dietPlans.delete(platformContext, gymId, id);
  await adjustGymCounter(gyms, gymId, "dietPlanCount", -1);
  return true;
}

export async function deleteDietPlanForMember(
  gymId: string,
  memberId: string,
): Promise<boolean> {
  const { dietPlans } = getRepositories();
  const doc = await dietPlans.findByMemberId(platformContext, gymId, memberId);
  if (!doc) return false;
  return deleteDietPlanRecord(gymId, doc.id);
}
