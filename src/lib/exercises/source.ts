import type { ExerciseSource } from "@/lib/exercises/catalog-types";
import { EXERCISE_SOURCES } from "@/lib/exercises/catalog-types";

/** Minimal fields needed to infer exercise source from legacy or new docs. */
export type ExerciseSourceInput = {
  isSeeded: boolean;
  exerciseSource?: ExerciseSource | null;
};

export function isExerciseSource(value: unknown): value is ExerciseSource {
  return (
    typeof value === "string" &&
    (EXERCISE_SOURCES as readonly string[]).includes(value)
  );
}

/**
 * Derives the authoritative exercise source for a gym exercise document.
 * Explicit valid `exerciseSource` wins; legacy docs infer from `isSeeded`.
 */
export function resolveExerciseSource(input: ExerciseSourceInput): ExerciseSource {
  if (isExerciseSource(input.exerciseSource)) {
    return input.exerciseSource;
  }
  if (input.isSeeded) {
    return "SEEDED";
  }
  return "CUSTOM";
}
