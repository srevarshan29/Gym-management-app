import { getRepositories, platformContext } from "@/lib/firestore";

/** Trim whitespace from a display name before persist/compare. */
export function normalizeDisplayName(name: string): string {
  return name.trim();
}

/** True if another user in the same gym already has this display name. */
export async function isDisplayNameTakenInGym(
  tenantGymId: string,
  name: string,
  excludeUserId?: string,
): Promise<boolean> {
  const { users } = getRepositories();
  return users.isDisplayNameTakenInGym(
    platformContext,
    tenantGymId,
    normalizeDisplayName(name),
    excludeUserId,
  );
}
