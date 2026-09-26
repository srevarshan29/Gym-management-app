import { cache } from "react";

import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { WorkoutPlanDoc } from "@/lib/firestore/types";
import { measureServerPhase } from "@/lib/server-perf";
import { getExercisesByIds } from "@/lib/workout-tracking/exercise-library";
import { buildMemberWorkoutPlanDetail } from "@/lib/workout-plans";
import {
  getPreviousSetsForSessionExercises,
  type PreviousSetsBySessionExerciseId,
} from "@/lib/workout-tracking/previous-sets";
import {
  buildActiveWorkoutSessionView,
  type ActiveWorkoutSession,
} from "@/lib/workout-tracking/sessions";
import {
  collectLibraryExerciseIdsFromPlan,
  emptyWorkoutPlanShellForSession,
} from "@/lib/workout-tracking/session-plan";
import {
  collectLibraryExerciseIdsFromSessionExercises,
} from "@/lib/workout-tracking/session-exercise-identity";
import type { ExerciseListItem, WorkoutPlanDetail } from "@/lib/workout-tracking/types";

export type MemberWorkoutPageData = {
  plan: WorkoutPlanDetail | null;
  activeSession: ActiveWorkoutSession | null;
  previousSets: PreviousSetsBySessionExerciseId;
  canStart: boolean;
};

function memberContext(gymId: string, memberId: string): MemberContext {
  return { kind: "member", gymId, memberId };
}

function exerciseLookupFromItems(
  items: ExerciseListItem[],
): Map<string, ExerciseListItem> {
  return new Map(items.map((item) => [item.id, item]));
}

async function resolvePlanDocForMemberWorkout(
  ctx: MemberContext,
  gymId: string,
  memberId: string,
  memberPlan: DocWithId<WorkoutPlanDoc> | null,
  activeSessionPlanId: string | null,
): Promise<DocWithId<WorkoutPlanDoc> | null> {
  const { workoutPlans } = getRepositories();

  if (
    memberPlan &&
    (!activeSessionPlanId || memberPlan.id === activeSessionPlanId)
  ) {
    return memberPlan;
  }

  if (activeSessionPlanId) {
    const sessionPlan = await workoutPlans.getById(
      ctx,
      gymId,
      activeSessionPlanId,
    );
    if (sessionPlan) return sessionPlan;
  }

  return memberPlan;
}

export const loadMemberWorkoutPageData = cache(
  async (gymId: string, memberId: string): Promise<MemberWorkoutPageData> => {
    return measureServerPhase("member.workout.page", async () => {
      const ctx = memberContext(gymId, memberId);
      const { workoutPlans, workoutSessions } = getRepositories();

      const [memberPlan, activeRaw] = await Promise.all([
        workoutPlans.findByMemberId(ctx, gymId, memberId),
        workoutSessions.findActiveSession(ctx, gymId, memberId),
      ]);

      const planDoc = await resolvePlanDocForMemberWorkout(
        ctx,
        gymId,
        memberId,
        memberPlan,
        activeRaw?.workoutPlanId ?? null,
      );

      const exerciseIds = new Set<string>();
      if (planDoc) {
        for (const id of collectLibraryExerciseIdsFromPlan(planDoc)) {
          exerciseIds.add(id);
        }
      }
      if (activeRaw) {
        for (const id of collectLibraryExerciseIdsFromSessionExercises(
          activeRaw.exercises,
        )) {
          exerciseIds.add(id);
        }
      }

      const libraryItems =
        exerciseIds.size > 0
          ? await getExercisesByIds(gymId, [...exerciseIds])
          : [];
      const lookup = exerciseLookupFromItems(libraryItems);

      const planForSessionView =
        planDoc ??
        (activeRaw ? emptyWorkoutPlanShellForSession(activeRaw) : null);

      const planDetail = planDoc
        ? buildMemberWorkoutPlanDetail(planDoc, lookup)
        : null;
      const activeSession =
        activeRaw && planForSessionView
          ? buildActiveWorkoutSessionView(
              gymId,
              planForSessionView,
              activeRaw,
              libraryItems,
            )
          : null;

      const previousSets =
        activeRaw && planForSessionView
          ? await getPreviousSetsForSessionExercises(
              gymId,
              memberId,
              activeRaw.exercises.map((exercise) => ({
                sessionExerciseId: exercise.id,
                exerciseId: exercise.exerciseId ?? null,
                customName: exercise.customName ?? null,
              })),
              { planDoc: planForSessionView },
            )
          : {};

      const canStart = Boolean(
        planDetail &&
          !planDetail.isLegacy &&
          planDetail.days.some((day) => day.exercises.length > 0),
      );

      return {
        plan: planDetail,
        activeSession,
        previousSets,
        canStart,
      };
    });
  },
);
