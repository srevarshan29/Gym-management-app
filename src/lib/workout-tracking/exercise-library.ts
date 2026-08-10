import type { MuscleGroup } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import { muscleGroupLabel } from "@/lib/exercises";
import type { ExerciseListItem } from "@/lib/workout-tracking/types";

export async function getExerciseLibrary(
  gymId: string,
  muscleGroup?: MuscleGroup | null,
): Promise<ExerciseListItem[]> {
  return withTenant(gymId, async (tx) => {
    const rows = await tx.exercise.findMany({
      where: {
        gymId,
        ...(muscleGroup ? { muscleGroup } : {}),
      },
      orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        muscleGroup: true,
        defaultSets: true,
        defaultReps: true,
        defaultTempo: true,
        defaultRestSeconds: true,
        isSeeded: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      muscleGroup: row.muscleGroup,
      defaultSets: row.defaultSets,
      defaultReps: row.defaultReps,
      defaultTempo: row.defaultTempo,
      defaultRestSeconds: row.defaultRestSeconds,
      isSeeded: row.isSeeded,
    }));
  });
}

export function groupExercisesByMuscle<T extends { muscleGroup: string; name: string }>(
  exercises: T[],
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const exercise of exercises) {
    const key = muscleGroupLabel(exercise.muscleGroup as Parameters<typeof muscleGroupLabel>[0]);
    if (!groups[key]) groups[key] = [];
    groups[key].push(exercise);
  }
  for (const key of Object.keys(groups)) {
    groups[key]!.sort((a, b) => a.name.localeCompare(b.name));
  }
  return groups;
}
