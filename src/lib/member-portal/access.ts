import { getRepositories, platformContext } from "@/lib/firestore";

/** Direct Firestore read scoped by session memberId (not tenant middleware). */
export async function getMemberPortalRow(
  tenantGymId: string,
  memberId: string,
) {
  const { members } = getRepositories();
  const member = await members.findByIdAndGym(
    { kind: "member", memberId, gymId: tenantGymId },
    memberId,
    tenantGymId,
  );
  if (!member) return null;

  return {
    id: member.id,
    gymId: member.gymId,
    name: member.name,
    phone: member.phone,
    email: member.email,
    photoUrl: member.photoUrl,
    gender: member.gender,
    memberNumber: member.memberNumber,
    fitnessGoal: member.fitnessGoal,
    ageYears: member.ageYears,
    heightCm: member.heightCm,
    weightKg: member.weightKg,
    portalEnabledAt: member.portalEnabledAt,
  };
}

export { getGymByRegistrationToken } from "@/lib/registration";
