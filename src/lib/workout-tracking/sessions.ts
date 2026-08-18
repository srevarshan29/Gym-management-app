import { prisma } from "@/lib/prisma";
import { muscleGroupLabel } from "@/lib/exercises";
import type { ExerciseTrackingType, MuscleGroup } from "@prisma/client";

export type ActiveWorkoutSetLog = {
  setNumber: number;
  weightKg: number | null;
  durationSeconds: number | null;
};

export type ActiveWorkoutSession = {
  id: string;
  startedAt: string;
  durationSeconds: number | null;
  exercises: {
    id: string;
    sortOrder: number;
    displayName: string;
    muscleGroup: string | null;
    trackingType: ExerciseTrackingType;
    exerciseId: string | null;
    customName: string | null;
    targetSets: number;
    targetReps: string;
    targetWeightKg: number | null;
    restSeconds: number | null;
    sets: ActiveWorkoutSetLog[];
  }[];
};

function resolveTrackingType(planExercise: {
  trackingTypeOverride: ExerciseTrackingType | null;
  exercise: { trackingType: ExerciseTrackingType } | null;
}): ExerciseTrackingType {
  return (
    planExercise.trackingTypeOverride ??
    planExercise.exercise?.trackingType ??
    "WEIGHTED"
  );
}

export async function getActiveWorkoutSession(
  tenantGymId: string,
  memberId: string,
): Promise<ActiveWorkoutSession | null> {
  const session = await prisma.workoutSession.findFirst({
    where: {
      gymId: tenantGymId,
      memberId: memberId,
      status: "IN_PROGRESS",
    },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      durationSeconds: true,
      exercises: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          planExercise: {
            select: {
              targetSets: true,
              targetReps: true,
              targetWeightKg: true,
              restSeconds: true,
              customName: true,
              exerciseId: true,
              trackingTypeOverride: true,
              exercise: {
                select: { name: true, muscleGroup: true, trackingType: true },
              },
            },
          },
          sets: {
            orderBy: { setNumber: "asc" },
            select: { setNumber: true, weightKg: true, durationSeconds: true },
          },
        },
      },
    },
  });
  if (!session) return null;

  return {
    id: session.id,
    startedAt: session.startedAt.toISOString(),
    durationSeconds: session.durationSeconds,
    exercises: session.exercises.map((row) => ({
      id: row.id,
      sortOrder: row.sortOrder,
      displayName:
        row.planExercise.exercise?.name ??
        row.planExercise.customName ??
        "Exercise",
      muscleGroup: row.planExercise.exercise
        ? muscleGroupLabel(row.planExercise.exercise.muscleGroup as MuscleGroup)
        : null,
      trackingType: resolveTrackingType(row.planExercise),
      exerciseId: row.planExercise.exerciseId,
      customName: row.planExercise.customName,
      targetSets: row.planExercise.targetSets,
      targetReps: row.planExercise.targetReps,
      targetWeightKg:
        row.planExercise.targetWeightKg != null
          ? Number(row.planExercise.targetWeightKg)
          : null,
      restSeconds: row.planExercise.restSeconds,
      sets: row.sets.map((set) => ({
        setNumber: set.setNumber,
        weightKg: set.weightKg != null ? Number(set.weightKg) : null,
        durationSeconds: set.durationSeconds,
      })),
    })),
  };
}
