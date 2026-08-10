import type { MuscleGroup, Prisma } from "@prisma/client";

export type SeedExercise = {
  name: string;
  muscleGroup: MuscleGroup;
  defaultSets?: number;
  defaultReps?: string;
  defaultTempo?: string;
  defaultRestSeconds?: number;
};

export const MUSCLE_GROUP_VALUES = [
  "CHEST",
  "BACK",
  "LEGS",
  "SHOULDERS",
  "ARMS",
  "CORE",
] as const satisfies readonly MuscleGroup[];

export const MUSCLE_GROUP_OPTIONS: { value: MuscleGroup; label: string }[] = [
  { value: "CHEST", label: "Chest" },
  { value: "BACK", label: "Back" },
  { value: "LEGS", label: "Legs" },
  { value: "SHOULDERS", label: "Shoulders" },
  { value: "ARMS", label: "Arms" },
  { value: "CORE", label: "Core" },
];

export function muscleGroupLabel(group: MuscleGroup): string {
  return MUSCLE_GROUP_OPTIONS.find((o) => o.value === group)?.label ?? group;
}

/** Starter library seeded for each gym (~36 exercises). */
export const SEED_EXERCISES: SeedExercise[] = [
  // Chest
  { name: "Bench Press", muscleGroup: "CHEST", defaultSets: 4, defaultReps: "8-10", defaultRestSeconds: 90 },
  { name: "Incline DB Press", muscleGroup: "CHEST", defaultSets: 3, defaultReps: "10-12", defaultRestSeconds: 90 },
  { name: "Push Ups", muscleGroup: "CHEST", defaultSets: 3, defaultReps: "12-15", defaultRestSeconds: 60 },
  { name: "Cable Fly", muscleGroup: "CHEST", defaultSets: 3, defaultReps: "12-15", defaultRestSeconds: 60 },
  { name: "Dips", muscleGroup: "CHEST", defaultSets: 3, defaultReps: "8-12", defaultRestSeconds: 90 },
  // Back
  { name: "Lat Pulldown", muscleGroup: "BACK", defaultSets: 4, defaultReps: "10-12", defaultRestSeconds: 90 },
  { name: "Barbell Row", muscleGroup: "BACK", defaultSets: 4, defaultReps: "8-10", defaultRestSeconds: 90 },
  { name: "Seated Cable Row", muscleGroup: "BACK", defaultSets: 3, defaultReps: "10-12", defaultRestSeconds: 75 },
  { name: "Pull Ups", muscleGroup: "BACK", defaultSets: 3, defaultReps: "6-10", defaultRestSeconds: 120 },
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
  { name: "Plank", muscleGroup: "CORE", defaultSets: 3, defaultReps: "45-60s", defaultRestSeconds: 45 },
  { name: "Hanging Leg Raise", muscleGroup: "CORE", defaultSets: 3, defaultReps: "10-15", defaultRestSeconds: 60 },
  { name: "Cable Crunch", muscleGroup: "CORE", defaultSets: 3, defaultReps: "15-20", defaultRestSeconds: 45 },
  { name: "Russian Twist", muscleGroup: "CORE", defaultSets: 3, defaultReps: "20", defaultRestSeconds: 45 },
];

export async function seedExercisesForGym(
  tx: Pick<Prisma.TransactionClient, "exercise">,
  gymId: string,
): Promise<void> {
  await tx.exercise.createMany({
    data: SEED_EXERCISES.map((item) => ({
      gymId,
      name: item.name,
      muscleGroup: item.muscleGroup,
      defaultSets: item.defaultSets ?? null,
      defaultReps: item.defaultReps ?? null,
      defaultTempo: item.defaultTempo ?? null,
      defaultRestSeconds: item.defaultRestSeconds ?? null,
      isSeeded: true,
    })),
    skipDuplicates: true,
  });
}
