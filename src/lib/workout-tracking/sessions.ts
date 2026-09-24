import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import { muscleGroupLabel } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/muscle-groups";
import { getExercisesByIds } from "@/lib/workout-tracking/exercise-library";
import { resolveMemberExerciseMedia } from "@/lib/workout-tracking/member-exercise-media";
import { emptyExerciseMediaMetadata } from "@/lib/exercises/media-validation";
import type { ExerciseLibraryMap } from "@/lib/workout-tracking/session-plan";
import {
  buildPlanExerciseMap,
  collectLibraryExerciseIdsFromPlan,
  planExerciseDisplayName,
  resolvePlanExerciseTrackingType,
} from "@/lib/workout-tracking/session-plan";
import {
  collectLibraryExerciseIdsFromSessionExercises,
  resolveSessionExerciseContext,
} from "@/lib/workout-tracking/session-exercise-identity";
import type { ActiveWorkoutSession } from "@/lib/workout-tracking/types";

export type { ActiveWorkoutSession, ActiveWorkoutSetLog } from "@/lib/workout-tracking/types";

function memberContext(gymId: string, memberId: string): MemberContext {
  return { kind: "member", gymId, memberId };
}

export async function getActiveWorkoutSession(
  tenantGymId: string,
  memberId: string,
): Promise<ActiveWorkoutSession | null> {
  const ctx = memberContext(tenantGymId, memberId);
  const { workoutPlans, workoutSessions } = getRepositories();

  const session = await workoutSessions.findActiveSession(
    ctx,
    tenantGymId,
    memberId,
  );
  if (!session) return null;

  const plan = await workoutPlans.getById(ctx, tenantGymId, session.workoutPlanId);
  if (!plan) return null;

  const exerciseIds = [
    ...new Set([
      ...collectLibraryExerciseIdsFromPlan(plan),
      ...collectLibraryExerciseIdsFromSessionExercises(session.exercises),
    ]),
  ];
  const libraryItems = await getExercisesByIds(tenantGymId, exerciseIds);
  const library: ExerciseLibraryMap = new Map(
    libraryItems.map((item) => [
      item.id,
      {
        name: item.name,
        muscleGroup: item.muscleGroup,
        trackingType: item.trackingType,
        isSeeded: item.isSeeded,
      },
    ]),
  );
  const mediaById = new Map(
    libraryItems.map((item) => [
      item.id,
      {
        media: item.media ?? emptyExerciseMediaMetadata(),
        hasMedia: item.hasMedia,
      },
    ]),
  );

  const planExerciseMap = buildPlanExerciseMap(plan);

  return {
    id: session.id,
    startedAt: session.startedAt.toDate().toISOString(),
    durationSeconds: session.durationSeconds,
    exercises: [...session.exercises]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => {
        const exerciseContext = resolveSessionExerciseContext(row, planExerciseMap);
        if (!exerciseContext) {
          return {
            id: row.id,
            sortOrder: row.sortOrder,
            displayName: "Exercise",
            muscleGroup: null,
            trackingType: "WEIGHTED" as const,
            exerciseId: null,
            customName: null,
            targetSets: 1,
            targetReps: "",
            targetWeightKg: null,
            restSeconds: null,
            media: null,
            hasMedia: false,
            sets: row.sets.map((set) => ({
              setNumber: set.setNumber,
              weightKg: set.weightKg,
              durationSeconds: set.durationSeconds,
            })),
          };
        }

        const libraryExercise = exerciseContext.exerciseId
          ? library.get(exerciseContext.exerciseId)
          : null;
        const mediaEntry = resolveMemberExerciseMedia(
          exerciseContext.exerciseId,
          mediaById,
        );

        return {
          id: row.id,
          sortOrder: row.sortOrder,
          displayName: planExerciseDisplayName(exerciseContext, library),
          muscleGroup: libraryExercise
            ? muscleGroupLabel(libraryExercise.muscleGroup as MuscleGroup)
            : null,
          trackingType: resolvePlanExerciseTrackingType(exerciseContext, library),
          exerciseId: exerciseContext.exerciseId,
          customName: exerciseContext.customName,
          targetSets: exerciseContext.targetSets,
          targetReps: exerciseContext.targetReps,
          targetWeightKg: exerciseContext.targetWeightKg,
          restSeconds: exerciseContext.restSeconds,
          media: mediaEntry.media,
          hasMedia: mediaEntry.hasMedia,
          sets: row.sets.map((set) => ({
            setNumber: set.setNumber,
            weightKg: set.weightKg,
            durationSeconds: set.durationSeconds,
          })),
        };
      }),
  };
}
