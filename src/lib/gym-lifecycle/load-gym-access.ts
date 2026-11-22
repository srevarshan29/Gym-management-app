import { getRepositories, platformContext } from "@/lib/firestore";
import { gymAllowsTenantAccess } from "@/lib/gym-lifecycle/status";

/** Returns whether the gym exists and allows tenant access (active or legacy). */
export async function isGymIdAccessible(gymId: string): Promise<boolean> {
  const { gyms } = getRepositories();
  const gym = await gyms.getById(platformContext, gymId);
  if (!gym) return false;
  return gymAllowsTenantAccess(gym);
}