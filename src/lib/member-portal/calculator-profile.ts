import { requireMember } from "@/lib/member-session";
import { getMemberPortalRow } from "@/lib/member-portal/access";

export async function getMemberCalculatorProfile() {
  const session = await requireMember();
  const row = await getMemberPortalRow(session.gymId, session.memberId);
  if (!row) return null;

  return {
    weightKg: row.weightKg != null ? Number(row.weightKg) : null,
    heightCm: row.heightCm,
    ageYears: row.ageYears,
    fitnessGoal: row.fitnessGoal,
    gender: row.gender,
  };
}
