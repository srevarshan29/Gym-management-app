import { requireMember } from "@/lib/member-session";
import {
  defaultNutritionLogDate,
  loadMemberNutritionDay,
  parseNutritionLogDate,
} from "@/lib/nutrition/member-day";
import { MemberNutritionPageClient } from "@/components/member-portal/nutrition/member-nutrition-page-client";

export default async function MemberNutritionPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await requireMember();
  const ctx = {
    kind: "member" as const,
    gymId: session.gymId,
    memberId: session.memberId,
  };

  let logDate = defaultNutritionLogDate();
  if (searchParams.date) {
    try {
      logDate = parseNutritionLogDate(searchParams.date);
    } catch {
      logDate = defaultNutritionLogDate();
    }
  }

  const day = await loadMemberNutritionDay(ctx, logDate);

  return <MemberNutritionPageClient initialDay={day} />;
}
