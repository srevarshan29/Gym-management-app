import { prisma } from "@/lib/prisma";
import { muscleGroupLabel } from "@/lib/exercises";
import type { MuscleGroup } from "@prisma/client";

export type ActiveWorkoutSession = {
  id: string;
  startedAt: Date;
  durationSeconds: number | null;
  exercises: {
    id: string;
    sortOrder: number;
    displayName: string;
    muscleGroup: string | null;
    targetSets: number;
    targetReps: string;
    targetWeightKg: number | null;
    restSeconds: number | null;
    sets: { setNumber: number; weightKg: number }[];
  }[];
};

export async function getActiveWorkoutSession(
  gymId: string,
  memberId: string,
): Promise<ActiveWorkoutSession | null> {
  const session = await prisma.workoutSession.findFirst({
    where: { gymId, memberId, status: "IN_PROGRESS" },
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
              exercise: { select: { name: true, muscleGroup: true } },
            },
          },
          sets: {
            orderBy: { setNumber: "asc" },
            select: { setNumber: true, weightKg: true },
          },
        },
      },
    },
  });
  if (!session) return null;

  return {
    id: session.id,
    startedAt: session.startedAt,
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
      targetSets: row.planExercise.targetSets,
      targetReps: row.planExercise.targetReps,
      targetWeightKg:
        row.planExercise.targetWeightKg != null
          ? Number(row.planExercise.targetWeightKg)
          : null,
      restSeconds: row.planExercise.restSeconds,
      sets: row.sets.map((set) => ({
        setNumber: set.setNumber,
        weightKg: Number(set.weightKg),
      })),
    })),
  };
}
