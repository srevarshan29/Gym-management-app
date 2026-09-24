import type {
  CatalogSyncPlan,
  CatalogSyncPlanItem,
  ValidatedCatalogExercise,
} from "@/lib/catalog/types";

export const CATALOG_SYNC_BATCH_SIZE = 50;

export type ExistingCatalogSnapshot = {
  catalogId: string;
  catalogVersion: string;
  nameLower: string;
  isActive: boolean;
  contentFingerprint: string;
};

export function fingerprintCatalogExercise(
  exercise: ValidatedCatalogExercise,
): string {
  return JSON.stringify({
    catalogVersion: exercise.catalogVersion,
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
    searchPrefixes: exercise.searchPrefixes,
    isActive: exercise.isActive,
  });
}

export function computeCatalogSyncPlan(
  inputExercises: ValidatedCatalogExercise[],
  existing: ExistingCatalogSnapshot[],
): CatalogSyncPlan {
  const inputById = new Map(inputExercises.map((row) => [row.catalogId, row]));
  const existingById = new Map(existing.map((row) => [row.catalogId, row]));
  const items: CatalogSyncPlanItem[] = [];

  for (const exercise of inputExercises) {
    const current = existingById.get(exercise.catalogId);
    const fingerprint = fingerprintCatalogExercise(exercise);

    if (!current) {
      items.push({ catalogId: exercise.catalogId, action: "create", warnings: [] });
      continue;
    }

    if (current.contentFingerprint === fingerprint) {
      items.push({ catalogId: exercise.catalogId, action: "unchanged", warnings: [] });
      continue;
    }

    items.push({ catalogId: exercise.catalogId, action: "update", warnings: [] });
  }

  for (const current of existing) {
    if (!inputById.has(current.catalogId) && current.isActive) {
      items.push({
        catalogId: current.catalogId,
        action: "deactivate",
        warnings: ["Catalog entry missing from input bundle; would mark inactive."],
      });
    }
  }

  items.sort((a, b) => a.catalogId.localeCompare(b.catalogId));

  return {
    items,
    wouldCreate: items.filter((item) => item.action === "create").length,
    wouldUpdate: items.filter((item) => item.action === "update").length,
    wouldDeactivate: items.filter((item) => item.action === "deactivate").length,
    unchanged: items.filter((item) => item.action === "unchanged").length,
  };
}

export function chunkCatalogSyncPlan(items: CatalogSyncPlanItem[]): CatalogSyncPlanItem[][] {
  const batches: CatalogSyncPlanItem[][] = [];
  for (let i = 0; i < items.length; i += CATALOG_SYNC_BATCH_SIZE) {
    batches.push(items.slice(i, i + CATALOG_SYNC_BATCH_SIZE));
  }
  return batches;
}

export function existingSnapshotFromValidated(
  exercise: ValidatedCatalogExercise,
): ExistingCatalogSnapshot {
  return {
    catalogId: exercise.catalogId,
    catalogVersion: exercise.catalogVersion,
    nameLower: exercise.nameLower,
    isActive: exercise.isActive,
    contentFingerprint: fingerprintCatalogExercise(exercise),
  };
}
