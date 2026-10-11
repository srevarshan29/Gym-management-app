import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { WorkoutPlanDoc, WorkoutSessionDoc } from "@/lib/firestore/types";
import {
  isPersonalWorkoutSession,
  personalWorkoutToPlanDoc,
} from "@/lib/workout-tracking/member-personal-workout-plan";
import {
  getPreviousSetsForSessionExercises,
  type PreviousSetsBySessionExerciseId,
} from "@/lib/workout-tracking/previous-sets";
import { emptyWorkoutPlanShellForSession } from "@/lib/workout-tracking/session-plan";

async function resolvePlanDocForActiveSession(
  ctx: MemberContext,
  gymId: string,
  memberId: string,
  memberPlan: DocWithId<WorkoutPlanDoc> | null,
  activeRaw: DocWithId<WorkoutSessionDoc>,
): Promise<DocWithId<WorkoutPlanDoc> | null> {
  const { workoutPlans, memberPersonalWorkouts } = getRepositories();

  if (isPersonalWorkoutSession(activeRaw)) {
    const personal = await memberPersonalWorkouts.getForMember(
      ctx,
      gymId,
      memberId,
      activeRaw.personalWorkoutId!,
    );
    if (personal) return personalWorkoutToPlanDoc(personal);
  }

  const activeSessionPlanId = activeRaw.workoutPlanId ?? null;

  if (
    memberPlan &&
    (!activeSessionPlanId || memberPlan.id === activeSessionPlanId)
  ) {
    return memberPlan;
  }

  if (activeSessionPlanId && !isPersonalWorkoutSession(activeRaw)) {
    const sessionPlan = await workoutPlans.getById(
      ctx,
      gymId,
      activeSessionPlanId,
    );
    if (sessionPlan) return sessionPlan;
  }

  return memberPlan;
}

/** Member-owned active session only; used for deferred previous-set hydration. */
export async function loadPreviousSetsForActiveMemberSession(
  ctx: MemberContext,
  sessionId: string,
): Promise<PreviousSetsBySessionExerciseId | null> {
  const trimmedId = sessionId.trim();
  if (!trimmedId) return null;

  const gymId = ctx.gymId;
  const memberId = ctx.memberId;
  const { workoutPlans, workoutSessions } = getRepositories();

  const activeRaw = await workoutSessions.getActiveSessionForMember(
    ctx,
    gymId,
    memberId,
    trimmedId,
  );
  if (!activeRaw) return null;

  const memberPlan = await workoutPlans.findByMemberId(ctx, gymId, memberId);
  const planDoc = await resolvePlanDocForActiveSession(
    ctx,
    gymId,
    memberId,
    memberPlan,
    activeRaw,
  );
  const planForSessionView =
    planDoc ?? emptyWorkoutPlanShellForSession(activeRaw);

  return getPreviousSetsForSessionExercises(
    gymId,
    memberId,
    activeRaw.exercises.map((exercise) => ({
      sessionExerciseId: exercise.id,
      exerciseId: exercise.exerciseId ?? null,
      customName: exercise.customName ?? null,
    })),
    { planDoc: planForSessionView },
  );
}
