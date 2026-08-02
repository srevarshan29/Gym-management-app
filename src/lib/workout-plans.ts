import type { WorkoutLevel } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import type { MemberOption } from "@/lib/programme-types";

export type { MemberOption };

export type WorkoutPlanListItem = {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  level: WorkoutLevel;
  weeklySchedule: string;
};

export type WorkoutPlansPageData = {
  plans: WorkoutPlanListItem[];
  members: MemberOption[];
};

export async function getWorkoutPlansPageData(
  gymId: string,
): Promise<WorkoutPlansPageData> {
  return withTenant(gymId, async (tx) => {
    const [plans, members] = await Promise.all([
      tx.workoutPlan.findMany({
        where: { gymId },
        orderBy: [{ member: { name: "asc" } }],
        select: {
          id: true,
          memberId: true,
          title: true,
          level: true,
          weeklySchedule: true,
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
        level: plan.level,
        weeklySchedule: plan.weeklySchedule,
      })),
      members,
    };
  });
}
