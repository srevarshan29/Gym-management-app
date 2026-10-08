import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { WorkoutPlanDoc, WorkoutSessionDoc } from "@/lib/firestore/types";
import {
  isPersonalWorkoutSession,
  personalWorkoutToPlanDoc,
} from "@/lib/workout-tracking/member-personal-workout-plan";

export async function resolvePlanDocForWorkoutSession(
  ctx: MemberContext,
  gymId: string,
  memberId: string,
  session: Pick<
    WorkoutSessionDoc,
    "workoutPlanId" | "sessionKind" | "personalWorkoutId"
  >,
): Promise<DocWithId<WorkoutPlanDoc> | null> {
  if (isPersonalWorkoutSession(session)) {
    const { memberPersonalWorkouts } = getRepositories();
    const personal = await memberPersonalWorkouts.getForMember(
      ctx,
      gymId,
      memberId,
      session.personalWorkoutId!,
    );
    return personal ? personalWorkoutToPlanDoc(personal) : null;
  }

  const { workoutPlans } = getRepositories();
  return workoutPlans.getById(ctx, gymId, session.workoutPlanId);
}
