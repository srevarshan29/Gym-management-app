import { Timestamp } from "firebase-admin/firestore";

import type { ValidatedCatalogExercise } from "@/lib/catalog/types";
import type { ExerciseCatalogDoc } from "@/lib/firestore/types";
import { omitUndefined, serverTimestamps, touchUpdatedAt } from "@/lib/firestore/serialize";

export function validatedExerciseToCatalogDoc(
  exercise: ValidatedCatalogExercise,
  options: { createdAt: Timestamp; updatedAt?: Timestamp },
): ExerciseCatalogDoc {
  const updatedAt = options.updatedAt ?? options.createdAt;
  return omitUndefined({
    catalogId: exercise.catalogId,
    name: exercise.name,
    nameLower: exercise.nameLower,
    muscleGroup: exercise.muscleGroup,
    description: exercise.description,
    instructions: exercise.instructions,
    tips: exercise.tips,
    equipment: exercise.equipment,
    bodyPart: exercise.bodyPart,
    difficulty: exercise.difficulty,
    movementPattern: exercise.movementPattern,
    primaryMuscles: exercise.primaryMuscles,
    secondaryMuscles: exercise.secondaryMuscles,
    safetyNotes: exercise.safetyNotes,
    category: exercise.category,
    isBodyweight: exercise.isBodyweight,
    media: exercise.media,
    provider: exercise.provider,
    catalogVersion: exercise.catalogVersion,
    searchPrefixes: exercise.searchPrefixes,
    isActive: exercise.isActive,
    createdAt: options.createdAt,
    updatedAt,
  }) as ExerciseCatalogDoc;
}

export function createCatalogDocFromValidated(
  exercise: ValidatedCatalogExercise,
  now: Timestamp = Timestamp.now(),
): ExerciseCatalogDoc {
  return validatedExerciseToCatalogDoc(exercise, serverTimestamps(now));
}

export function updateCatalogDocFromValidated(
  exercise: ValidatedCatalogExercise,
  existingCreatedAt: Timestamp,
  now: Timestamp = Timestamp.now(),
): ExerciseCatalogDoc {
  return validatedExerciseToCatalogDoc(exercise, {
    createdAt: existingCreatedAt,
    updatedAt: now,
  });
}
