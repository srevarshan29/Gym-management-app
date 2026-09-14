import { muscleGroupLabel } from "@/lib/muscle-groups";

export function groupExercisesByMuscle<T extends { muscleGroup: string; name: string }>(
  exercises: T[],
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const exercise of exercises) {
    const key = muscleGroupLabel(
      exercise.muscleGroup as Parameters<typeof muscleGroupLabel>[0],
    );
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(exercise);
  }
  for (const key of Object.keys(groups)) {
    groups[key]!.sort((a, b) => a.name.localeCompare(b.name));
  }
  return groups;
}
