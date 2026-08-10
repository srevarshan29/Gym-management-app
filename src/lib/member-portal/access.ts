import { prisma } from "@/lib/prisma";

/** Direct prisma for portal reads scoped by session memberId (not withTenant). */
export async function getMemberPortalRow(gymId: string, memberId: string) {
  return prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: {
      id: true,
      gymId: true,
      name: true,
      phone: true,
      email: true,
      photoUrl: true,
      gender: true,
      memberNumber: true,
      fitnessGoal: true,
      ageYears: true,
      heightCm: true,
      weightKg: true,
      portalEnabledAt: true,
    },
  });
}

export async function getGymByRegistrationToken(token: string) {
  return prisma.gym.findUnique({
    where: { registrationToken: token },
    select: { id: true, name: true, registrationToken: true },
  });
}
