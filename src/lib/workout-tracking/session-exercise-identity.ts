import type {
  ExerciseTrackingType,
  WorkoutPlanExerciseEmbedded,
  WorkoutSessionExerciseEmbedded,
} from "@/lib/firestore/types";
import type { PlanExerciseMap } from "@/lib/workout-tracking/session-plan";
import {
  matchesPlanExerciseIdentity,
  resolvePlanExerciseTrackingType,
} from "@/lib/workout-tracking/session-plan";
import type { ExerciseLibraryMap } from "@/lib/workout-tracking/session-plan";

export type SessionExerciseIdentitySnapshot = Pick<
  WorkoutPlanExerciseEmbedded,
  "exerciseId" | "customName" | "trackingTypeOverride" | "targetReps"
>;

export function hasSessionExerciseSnapshot(
  sessionExercise: WorkoutSessionExerciseEmbedded,
): boolean {
  return (
    "exerciseId" in sessionExercise ||
    "customName" in sessionExercise ||
    "trackingTypeOverride" in sessionExercise ||
    "targetReps" in sessionExercise
  );
}

export function getSessionExerciseSnapshot(
  sessionExercise: WorkoutSessionExerciseEmbedded,
): SessionExerciseIdentitySnapshot | null {
  if (!hasSessionExerciseSnapshot(sessionExercise)) {
    return null;
  }

  return {
    exerciseId: sessionExercise.exerciseId ?? null,
    customName: sessionExercise.customName ?? null,
    trackingTypeOverride: sessionExercise.trackingTypeOverride ?? null,
    targetReps: sessionExercise.targetReps ?? "",
  };
}

export function resolveSessionExerciseContext(
  sessionExercise: WorkoutSessionExerciseEmbedded,
  planExerciseMap: PlanExerciseMap,
): WorkoutPlanExerciseEmbedded | null {
  const planExercise = planExerciseMap.get(sessionExercise.workoutPlanExerciseId);
  if (planExercise) {
    return planExercise;
  }

  const snapshot = getSessionExerciseSnapshot(sessionExercise);
  if (!snapshot) {
    return null;
  }

  return {
    id: sessionExercise.workoutPlanExerciseId,
    exerciseId: snapshot.exerciseId,
    customName: snapshot.customName,
    sortOrder: sessionExercise.sortOrder,
    targetSets: 1,
    targetReps: snapshot.targetReps,
    tempo: null,
    restSeconds: null,
    targetWeightKg: null,
    trackingTypeOverride: snapshot.trackingTypeOverride,
  };
}

export function matchesSessionExerciseIdentity(
  sessionExercise: WorkoutSessionExerciseEmbedded,
  planExerciseMap: PlanExerciseMap,
  exerciseId: string | null,
  customName: string | null,
): boolean {
  const context = resolveSessionExerciseContext(sessionExercise, planExerciseMap);
  if (!context) {
    return false;
  }

  return matchesPlanExerciseIdentity(context, exerciseId, customName);
}

export function resolveSessionExerciseTrackingType(
  sessionExercise: WorkoutSessionExerciseEmbedded,
  planExerciseMap: PlanExerciseMap,
  library: ExerciseLibraryMap,
): ExerciseTrackingType | null {
  const context = resolveSessionExerciseContext(sessionExercise, planExerciseMap);
  if (!context) {
    return null;
  }

  return resolvePlanExerciseTrackingType(context, library);
}

export function collectLibraryExerciseIdsFromSessionExercises(
  sessionExercises: WorkoutSessionExerciseEmbedded[],
): string[] {
  const ids = new Set<string>();
  for (const exercise of sessionExercises) {
    const snapshot = getSessionExerciseSnapshot(exercise);
    const exerciseId = snapshot?.exerciseId?.trim();
    if (exerciseId) {
      ids.add(exerciseId);
    }
  }
  return [...ids];
}
