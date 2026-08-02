import { withTenant } from "@/lib/db-context";
import type { MemberOption } from "@/lib/programme-types";

export type { MemberOption };

export type DietPlanListItem = {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  caloriesPerDay: number;
  mealPlan: string;
};

export type DietPlansPageData = {
  plans: DietPlanListItem[];
  members: MemberOption[];
};

export async function getDietPlansPageData(
  gymId: string,
): Promise<DietPlansPageData> {
  return withTenant(gymId, async (tx) => {
    const [plans, members] = await Promise.all([
      tx.dietPlan.findMany({
        where: { gymId },
        orderBy: [{ member: { name: "asc" } }],
        select: {
          id: true,
          memberId: true,
          title: true,
          caloriesPerDay: true,
          mealPlan: true,
          member: { select: { name: true } },
        },
      }),
      tx.member.findMany({
        where: { gymId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

    return {
      plans: plans.map((plan) => ({
        id: plan.id,
        memberId: plan.memberId,
        memberName: plan.member.name,
        title: plan.title,
        caloriesPerDay: plan.caloriesPerDay,
        mealPlan: plan.mealPlan,
      })),
      members,
    };
  });
}
