import type { ExerciseTrackingType } from "@/lib/firestore/types";
import { getRepositories, newDocId, platformContext } from "@/lib/firestore";
import type { MuscleGroup } from "@/lib/muscle-groups";

export type { MuscleGroup } from "@/lib/muscle-groups";
export {
  MUSCLE_GROUP_OPTIONS,
  MUSCLE_GROUP_VALUES,
  muscleGroupLabel,
} from "@/lib/muscle-groups";

export type SeedExercise = {
  name: string;
  muscleGroup: MuscleGroup;
  defaultSets?: number;
  defaultReps?: string;
  defaultTempo?: string;
  defaultRestSeconds?: number;
  trackingType?: ExerciseTrackingType;
};

/** Starter library seeded for each gym (~36 exercises). */
export const SEED_EXERCISES: SeedExercise[] = [
  // Chest
  { name: "Bench Press", muscleGroup: "CHEST", defaultSets: 4, defaultReps: "8-10", defaultRestSeconds: 90 },
  { name: "Incline DB Press", muscleGroup: "CHEST", defaultSets: 3, defaultReps: "10-12", defaultRestSeconds: 90 },
  { name: "Push Ups", muscleGroup: "CHEST", defaultSets: 3, defaultReps: "12-15", defaultRestSeconds: 60, trackingType: "BODYWEIGHT" },
  { name: "Cable Fly", muscleGroup: "CHEST", defaultSets: 3, defaultReps: "12-15", defaultRestSeconds: 60 },
  { name: "Dips", muscleGroup: "CHEST", defaultSets: 3, defaultReps: "8-12", defaultRestSeconds: 90, trackingType: "BODYWEIGHT" },
  // Back
  { name: "Lat Pulldown", muscleGroup: "BACK", defaultSets: 4, defaultReps: "10-12", defaultRestSeconds: 90 },
  { name: "Barbell Row", muscleGroup: "BACK", defaultSets: 4, defaultReps: "8-10", defaultRestSeconds: 90 },
  { name: "Seated Cable Row", muscleGroup: "BACK", defaultSets: 3, defaultReps: "10-12", defaultRestSeconds: 75 },
  { name: "Pull Ups", muscleGroup: "BACK", defaultSets: 3, defaultReps: "6-10", defaultRestSeconds: 120, trackingType: "BODYWEIGHT" },
  { name: "Deadlift", muscleGroup: "BACK", defaultSets: 4, defaultReps: "5-6", defaultRestSeconds: 180 },
  // Legs
  { name: "Squat", muscleGroup: "LEGS", defaultSets: 4, defaultReps: "6-8", defaultRestSeconds: 120 },
  { name: "Leg Press", muscleGroup: "LEGS", defaultSets: 4, defaultReps: "10-12", defaultRestSeconds: 90 },
  { name: "Lunges", muscleGroup: "LEGS", defaultSets: 3, defaultReps: "10 each", defaultRestSeconds: 75 },
  { name: "Romanian Deadlift", muscleGroup: "LEGS", defaultSets: 3, defaultReps: "8-10", defaultRestSeconds: 90 },
  { name: "Leg Curl", muscleGroup: "LEGS", defaultSets: 3, defaultReps: "12-15", defaultRestSeconds: 60 },
  { name: "Calf Raise", muscleGroup: "LEGS", defaultSets: 4, defaultReps: "15-20", defaultRestSeconds: 45 },
  // Shoulders
  { name: "Overhead Press", muscleGroup: "SHOULDERS", defaultSets: 4, defaultReps: "6-8", defaultRestSeconds: 90 },
  { name: "DB Shoulder Press", muscleGroup: "SHOULDERS", defaultSets: 3, defaultReps: "10-12", defaultRestSeconds: 75 },
  { name: "Lateral Raises", muscleGroup: "SHOULDERS", defaultSets: 3, defaultReps: "12-15", defaultRestSeconds: 45 },
  { name: "Face Pulls", muscleGroup: "SHOULDERS", defaultSets: 3, defaultReps: "15-20", defaultRestSeconds: 45 },
  // Arms
  { name: "Barbell Curl", muscleGroup: "ARMS", defaultSets: 3, defaultReps: "10-12", defaultRestSeconds: 60 },
  { name: "DB Curl", muscleGroup: "ARMS", defaultSets: 3, defaultReps: "10-12", defaultRestSeconds: 60 },
  { name: "Hammer Curl", muscleGroup: "ARMS", defaultSets: 3, defaultReps: "10-12", defaultRestSeconds: 60 },
  { name: "Tricep Pushdown", muscleGroup: "ARMS", defaultSets: 3, defaultReps: "12-15", defaultRestSeconds: 60 },
  { name: "Skull Crushers", muscleGroup: "ARMS", defaultSets: 3, defaultReps: "10-12", defaultRestSeconds: 60 },
  // Core
  { name: "Plank", muscleGroup: "CORE", defaultSets: 3, defaultReps: "45-60s", defaultRestSeconds: 45, trackingType: "TIME" },
  { name: "Hanging Leg Raise", muscleGroup: "CORE", defaultSets: 3, defaultReps: "10-15", defaultRestSeconds: 60 },
  { name: "Cable Crunch", muscleGroup: "CORE", defaultSets: 3, defaultReps: "15-20", defaultRestSeconds: 45 },
  { name: "Russian Twist", muscleGroup: "CORE", defaultSets: 3, defaultReps: "20", defaultRestSeconds: 45 },
];

const SEED_TRACKING_BY_NAME = new Map(
  SEED_EXERCISES.filter((item) => item.trackingType).map((item) => [
    item.name.toLowerCase(),
    item.trackingType!,
  ]),
);

/** Seed catalog tracking type for a library exercise name (case-insensitive). */
export function getSeedTrackingTypeForName(
  name: string,
): ExerciseTrackingType | null {
  return SEED_TRACKING_BY_NAME.get(name.trim().toLowerCase()) ?? null;
}

/**
 * Correct stale seeded library rows that still use WEIGHTED after seed defaults
 * were updated (e.g. Push Ups → BODYWEIGHT).
 */
export function resolveSeededTrackingType(
  name: string,
  storedType: ExerciseTrackingType,
  isSeeded: boolean,
): ExerciseTrackingType {
  if (!isSeeded || storedType !== "WEIGHTED") return storedType;
  const seedType = getSeedTrackingTypeForName(name);
  if (seedType && seedType !== "WEIGHTED") return seedType;
  return storedType;
}

/** Idempotent seed — skips exercises that already exist (case-insensitive name). */
export async function seedExercisesForGym(tenantGymId: string): Promise<void> {
  const { customExercises } = getRepositories();

  for (const item of SEED_EXERCISES) {
    const nameLower = item.name.toLowerCase();
    const existing = await customExercises.findByNameLower(
      platformContext,
      tenantGymId,
      nameLower,
    );
    if (existing) {
      const desiredType = item.trackingType ?? "WEIGHTED";
      if (
        existing.isSeeded &&
        existing.trackingType !== desiredType &&
        desiredType !== "WEIGHTED"
      ) {
        await customExercises.update(platformContext, tenantGymId, existing.id, {
          trackingType: desiredType,
        });
      }
      continue;
    }

    await customExercises.createExercise(
      platformContext,
      tenantGymId,
      newDocId(),
      {
        name: item.name,
        muscleGroup: item.muscleGroup,
        defaultSets: item.defaultSets ?? null,
        defaultReps: item.defaultReps ?? null,
        defaultTempo: item.defaultTempo ?? null,
        defaultRestSeconds: item.defaultRestSeconds ?? null,
        trackingType: item.trackingType ?? "WEIGHTED",
        isSeeded: true,
      },
    );
  }
}
