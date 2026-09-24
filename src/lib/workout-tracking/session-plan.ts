import type {
  ExerciseTrackingType,
  WorkoutPlanDoc,
  WorkoutPlanExerciseEmbedded,
} from "@/lib/firestore/types";
import { resolveSeededTrackingType } from "@/lib/exercises";

export type PlanExerciseMap = Map<string, WorkoutPlanExerciseEmbedded>;

export type ExerciseLibraryMap = Map<
  string,
  {
    name: string;
    muscleGroup: string;
    trackingType: ExerciseTrackingType;
    isSeeded: boolean;
  }
>;

export function buildPlanExerciseMap(plan: WorkoutPlanDoc): PlanExerciseMap {
  const map: PlanExerciseMap = new Map();
  for (const day of plan.days ?? []) {
    for (const exercise of day.exercises) {
      map.set(exercise.id, exercise);
    }
  }
  return map;
}

/** Unique library exercise ids referenced by a workout plan. */
export function collectLibraryExerciseIdsFromPlan(
  plan: Pick<WorkoutPlanDoc, "days">,
): string[] {
  const ids = new Set<string>();
  for (const day of plan.days ?? []) {
    for (const exercise of day.exercises) {
      const id = exercise.exerciseId?.trim();
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

export function findDayIdForPlanExercise(
  plan: WorkoutPlanDoc,
  workoutPlanExerciseId: string,
): string | null {
  for (const day of plan.days ?? []) {
    if (day.exercises.some((row) => row.id === workoutPlanExerciseId)) {
      return day.id;
    }
  }
  return null;
}

export function countPlanExercises(plan: WorkoutPlanDoc): number {
  return (plan.days ?? []).reduce(
    (sum, day) => sum + day.exercises.length,
    0,
  );
}

export function isLegacyWorkoutPlan(plan: WorkoutPlanDoc): boolean {
  return (
    countPlanExercises(plan) === 0 && Boolean(plan.weeklySchedule?.trim())
  );
}

export function resolvePlanExerciseTrackingType(
  planExercise: WorkoutPlanExerciseEmbedded,
  library: ExerciseLibraryMap,
): ExerciseTrackingType {
  if (planExercise.trackingTypeOverride) {
    return planExercise.trackingTypeOverride;
  }
  if (planExercise.exerciseId) {
    const libraryExercise = library.get(planExercise.exerciseId);
    if (libraryExercise) {
      return resolveSeededTrackingType(
        libraryExercise.name,
        libraryExercise.trackingType,
        libraryExercise.isSeeded,
      );
    }
    return "WEIGHTED";
  }
  return "WEIGHTED";
}

export function planExerciseDisplayName(
  planExercise: WorkoutPlanExerciseEmbedded,
  library: ExerciseLibraryMap,
): string {
  if (planExercise.exerciseId) {
    return library.get(planExercise.exerciseId)?.name ?? "Exercise";
  }
  return planExercise.customName ?? "Exercise";
}

export function planExerciseIdentityKey(
  planExercise: WorkoutPlanExerciseEmbedded,
): string | null {
  if (planExercise.exerciseId) return `id:${planExercise.exerciseId}`;
  if (planExercise.customName) return `custom:${planExercise.customName}`;
  return null;
}

export function matchesPlanExerciseIdentity(
  planExercise: WorkoutPlanExerciseEmbedded,
  exerciseId: string | null,
  customName: string | null,
): boolean {
  if (exerciseId) return planExercise.exerciseId === exerciseId;
  if (customName) return planExercise.customName === customName;
  return false;
}

export function findPlanExercisesByIdentity(
  plan: WorkoutPlanDoc,
  exerciseId: string | null,
  customName: string | null,
): WorkoutPlanExerciseEmbedded[] {
  const matches: WorkoutPlanExerciseEmbedded[] = [];
  for (const day of plan.days ?? []) {
    for (const exercise of day.exercises) {
      if (matchesPlanExerciseIdentity(exercise, exerciseId, customName)) {
        matches.push(exercise);
      }
    }
  }
  return matches;
}

/** Prefer explicit plan overrides when the same library exercise appears on multiple days. */
export function resolveProgressTrackingType(
  matches: WorkoutPlanExerciseEmbedded[],
  library: ExerciseLibraryMap,
  exerciseId: string | null,
  observedSessionTypes: ExerciseTrackingType[] = [],
): ExerciseTrackingType {
  for (const match of matches) {
    if (match.trackingTypeOverride) {
      return match.trackingTypeOverride;
    }
  }

  if (observedSessionTypes.length > 0) {
    const counts = new Map<ExerciseTrackingType, number>();
    for (const type of observedSessionTypes) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
    let best = observedSessionTypes[0];
    let bestCount = 0;
    for (const [type, count] of counts) {
      if (count > bestCount) {
        best = type;
        bestCount = count;
      }
    }
    return best;
  }

  if (matches.length > 0) {
    return resolvePlanExerciseTrackingType(matches[0], library);
  }
  if (exerciseId) {
    const libraryExercise = library.get(exerciseId);
    if (libraryExercise) {
      return resolveSeededTrackingType(
        libraryExercise.name,
        libraryExercise.trackingType,
        libraryExercise.isSeeded,
      );
    }
    return "WEIGHTED";
  }
  return "WEIGHTED";
}
