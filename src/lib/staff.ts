import { withTenant } from "@/lib/db-context";

export type StaffOption = {
  id: string;
  name: string;
};

/** Gym staff accounts available as PT trainers (excludes SUPER_ADMIN). */
export async function getGymStaffOptions(
  tenantGymId: string,
): Promise<StaffOption[]> {
  return withTenant(tenantGymId, (tx) =>
    tx.user.findMany({
      where: { gymId: tenantGymId, role: { not: "SUPER_ADMIN" } },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
    }),
  );
}

/** Returns true when trainerId is a staff user in the same gym. */
export async function validateTrainerForGym(
  tenantGymId: string,
  trainerId: string,
): Promise<boolean> {
  const trainer = await withTenant(tenantGymId, (tx) =>
    tx.user.findFirst({
      where: {
        id: trainerId,
        gymId: tenantGymId,
        role: { not: "SUPER_ADMIN" },
      },
      select: { id: true },
    }),
  );
  return trainer != null;
}
