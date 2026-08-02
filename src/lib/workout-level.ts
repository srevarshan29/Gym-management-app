import type { WorkoutLevel } from "@prisma/client";

const LEVEL_LABEL: Record<WorkoutLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
};

export function workoutLevelLabel(level: WorkoutLevel): string {
  return LEVEL_LABEL[level];
}

export const WORKOUT_LEVELS: WorkoutLevel[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
];
