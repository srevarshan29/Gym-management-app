import type { WorkoutPlanDayEmbedded } from "@/lib/firestore/types";

/** Bounded batch size when scanning embedded plan rows for library exercise usage. */
export const EXERCISE_REFERENCE_SCAN_BATCH_SIZE = 50;

function isExerciseRow(value: unknown): value is { exerciseId?: string | null } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlanDay(value: unknown): value is Pick<WorkoutPlanDayEmbedded, "exercises"> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns true when embedded plan days reference a gym library exercise id.
 * Tolerates missing or malformed day/row shapes without throwing.
 */
export function planDaysReferenceLibraryExercise(
  days: unknown,
  exerciseId: string,
): boolean {
  const trimmedExerciseId = exerciseId.trim();
  if (!trimmedExerciseId || !Array.isArray(days)) {
    return false;
  }

  for (const day of days) {
    if (!isPlanDay(day)) continue;
    const exercises = day.exercises;
    if (!Array.isArray(exercises)) continue;

    for (const row of exercises) {
      if (!isExerciseRow(row)) continue;
      if (row.exerciseId != null && row.exerciseId === trimmedExerciseId) {
        return true;
      }
    }
  }

  return false;
}
