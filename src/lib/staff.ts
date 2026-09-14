import { getRepositories, platformContext } from "@/lib/firestore";

export type StaffOption = {
  id: string;
  name: string;
};

/** Gym staff accounts available as PT trainers (excludes SUPER_ADMIN). */
export async function getGymStaffOptions(
  tenantGymId: string,
): Promise<StaffOption[]> {
  const { users } = getRepositories();
  return users.getStaffOptions(platformContext, tenantGymId);
}

/** Returns true when trainerId is a staff user in the same gym. */
export async function validateTrainerForGym(
  tenantGymId: string,
  trainerId: string,
): Promise<boolean> {
  const { users } = getRepositories();
  return users.validateTrainerForGym(platformContext, tenantGymId, trainerId);
}
