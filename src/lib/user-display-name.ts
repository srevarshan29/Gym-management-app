import type { Prisma } from "@prisma/client";

/** Trim whitespace from a display name before persist/compare. */
export function normalizeDisplayName(name: string): string {
  return name.trim();
}

/** True if another user in the same gym already has this display name. */
export async function isDisplayNameTakenInGym(
  tx: Prisma.TransactionClient,
  gymId: string,
  name: string,
  excludeUserId?: string,
): Promise<boolean> {
  const normalized = normalizeDisplayName(name);
  const existing = await tx.user.findFirst({
    where: {
      gymId,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      name: { equals: normalized, mode: "insensitive" },
    },
    select: { id: true },
  });
  return existing !== null;
}
