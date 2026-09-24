/** How a gym exercise entered the library. */
export type ExerciseSource = "SEEDED" | "CUSTOM" | "CATALOG";

export const EXERCISE_SOURCES = [
  "SEEDED",
  "CUSTOM",
  "CATALOG",
] as const satisfies readonly ExerciseSource[];

export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export type ExerciseProvider = "repdb" | "custom" | "gym";

/** Static demonstration images for an exercise (v1: WebP stills only). */
export interface ExerciseMediaMetadata {
  /** Primary demonstration still (WebP). Required key; value null if missing. */
  primaryImageUrl: string | null;
  /** Secondary pose (peak/end), optional. */
  secondaryImageUrl: string | null;
  /** Small preview for lists; null = UI uses primaryImageUrl at smaller size. */
  thumbnailUrl: string | null;
  /** Reserved for future use; always null in v1. */
  animationUrl?: string | null;
  /** Reserved for future use; always null in v1. */
  videoUrl?: string | null;
}

export interface ExerciseProviderMetadata {
  provider: ExerciseProvider;
  providerExerciseId: string | null;
  attributionText: string | null;
  attributionUrl: string | null;
  licenseTier: string | null;
}
