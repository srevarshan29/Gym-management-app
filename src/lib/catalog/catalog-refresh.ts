import { Timestamp } from "firebase-admin/firestore";

import type { FirestoreContext } from "@/lib/firestore/context";
import { assertTenantAccess } from "@/lib/firestore/context";
import { omitUndefined } from "@/lib/firestore/serialize";
import type { FirestoreRepositories } from "@/lib/firestore/repositories";
import type { CustomExerciseDoc, ExerciseCatalogDoc } from "@/lib/firestore/types";
import { resolveExerciseSource } from "@/lib/exercises/source";
import { isCatalogLinkedExercise } from "@/lib/permissions";

export type CatalogRefreshResult =
  | { status: "refreshed"; exerciseId: string; catalogVersion: string }
  | { status: "unchanged"; exerciseId: string; catalogVersion: string }
  | { status: "unavailable"; reason: string }
  | { status: "invalid"; reason: string };

export function buildCatalogMetadataRefreshPatch(
  catalog: ExerciseCatalogDoc,
  existing: CustomExerciseDoc,
): Partial<CustomExerciseDoc> {
  return omitUndefined({
    importedCatalogVersion: catalog.catalogVersion,
    description: catalog.description,
    instructions: catalog.instructions,
    tips: catalog.tips,
    equipment: catalog.equipment,
    bodyPart: catalog.bodyPart,
    difficulty: catalog.difficulty,
    movementPattern: catalog.movementPattern,
    primaryMuscles: catalog.primaryMuscles,
    secondaryMuscles: catalog.secondaryMuscles,
    safetyNotes: catalog.safetyNotes,
    media: catalog.media,
    provider: catalog.provider,
    enrichedAt: Timestamp.now(),
    defaultSets: existing.defaultSets,
    defaultReps: existing.defaultReps,
    defaultTempo: existing.defaultTempo,
    defaultRestSeconds: existing.defaultRestSeconds,
    trackingType: existing.trackingType,
    name: existing.name,
    nameLower: existing.nameLower,
  }) as Partial<CustomExerciseDoc>;
}

export async function refreshExerciseFromCatalogForGym(params: {
  ctx: FirestoreContext;
  gymId: string;
  exerciseId: string;
  repos: Pick<FirestoreRepositories, "customExercises" | "exerciseCatalog">;
}): Promise<CatalogRefreshResult> {
  const { ctx, gymId, exerciseId, repos } = params;
  assertTenantAccess(ctx, gymId);

  const exercise = await repos.customExercises.getById(ctx, gymId, exerciseId);
  if (!exercise) {
    return { status: "unavailable", reason: "Exercise not found." };
  }
  if (exercise.gymId !== gymId) {
    return { status: "unavailable", reason: "Exercise not found." };
  }

  if (!isCatalogLinkedExercise(exercise)) {
    return { status: "invalid", reason: "Only catalog exercises can be refreshed." };
  }

  const catalogId = exercise.catalogId?.trim();
  if (!catalogId) {
    return { status: "invalid", reason: "Exercise is missing a catalog link." };
  }

  const catalog = await repos.exerciseCatalog.getByCatalogId(ctx, catalogId);
  if (!catalog) {
    return { status: "unavailable", reason: "Catalog exercise not found." };
  }
  if (!catalog.isActive) {
    return { status: "unavailable", reason: "Catalog exercise is inactive." };
  }
  if (catalog.catalogId !== catalogId) {
    return { status: "invalid", reason: "Catalog document id mismatch." };
  }

  if (exercise.importedCatalogVersion === catalog.catalogVersion) {
    return {
      status: "unchanged",
      exerciseId,
      catalogVersion: catalog.catalogVersion,
    };
  }

  const patch = buildCatalogMetadataRefreshPatch(catalog, exercise);
  if (resolveExerciseSource(exercise) !== "CATALOG") {
    patch.exerciseSource = "CATALOG";
  }
  await repos.customExercises.update(ctx, gymId, exerciseId, patch);

  return {
    status: "refreshed",
    exerciseId,
    catalogVersion: catalog.catalogVersion,
  };
}
