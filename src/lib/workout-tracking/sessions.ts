import { getRepositories } from "@/lib/firestore";
import type { MemberContext } from "@/lib/firestore/context";
import { platformContext } from "@/lib/firestore/helpers";
import { muscleGroupLabel } from "@/lib/muscle-groups";
import type { MuscleGroup } from "@/lib/muscle-groups";
import {
  buildPlanExerciseMap,
  planExerciseDisplayName,
  resolvePlanExerciseTrackingType,
  type ExerciseLibraryMap,
} from "@/lib/workout-tracking/session-plan";
import type { ActiveWorkoutSession } from "@/lib/workout-tracking/types";

export type { ActiveWorkoutSession, ActiveWorkoutSetLog } from "@/lib/workout-tracking/types";

async function loadExerciseLibraryMap(gymId: string): Promise<ExerciseLibraryMap> {
  const { customExercises } = getRepositories();
  const rows = await customExercises.listLibrary(platformContext, gymId);
  return new Map(
    rows.map((row) => [
      row.id,
      {
        name: row.name,
        muscleGroup: row.muscleGroup,
        trackingType: row.trackingType,
        isSeeded: row.isSeeded,
      },
    ]),
  );
}

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

  const [plan, library] = await Promise.all([
    workoutPlans.getById(ctx, tenantGymId, session.workoutPlanId),
    loadExerciseLibraryMap(tenantGymId),
  ]);
  if (!plan) return null;

  const planExerciseMap = buildPlanExerciseMap(plan);

  return {
    id: session.id,
    startedAt: session.startedAt.toDate().toISOString(),
    durationSeconds: session.durationSeconds,
    exercises: [...session.exercises]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => {
        const planExercise = planExerciseMap.get(row.workoutPlanExerciseId);
        if (!planExercise) {
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
            sets: row.sets.map((set) => ({
              setNumber: set.setNumber,
              weightKg: set.weightKg,
              durationSeconds: set.durationSeconds,
            })),
          };
        }

        const libraryExercise = planExercise.exerciseId
          ? library.get(planExercise.exerciseId)
          : null;

        return {
          id: row.id,
          sortOrder: row.sortOrder,
          displayName: planExerciseDisplayName(planExercise, library),
          muscleGroup: libraryExercise
            ? muscleGroupLabel(libraryExercise.muscleGroup as MuscleGroup)
            : null,
          trackingType: resolvePlanExerciseTrackingType(planExercise, library),
          exerciseId: planExercise.exerciseId,
          customName: planExercise.customName,
          targetSets: planExercise.targetSets,
          targetReps: planExercise.targetReps,
          targetWeightKg: planExercise.targetWeightKg,
          restSeconds: planExercise.restSeconds,
          sets: row.sets.map((set) => ({
            setNumber: set.setNumber,
            weightKg: set.weightKg,
            durationSeconds: set.durationSeconds,
          })),
        };
      }),
  };
}
