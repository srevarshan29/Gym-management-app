import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import { hasDemonstrationMedia } from "@/lib/exercises/media";
import {
  emptyExerciseMediaMetadata,
  sanitizeCatalogExerciseMediaForRead,
  sanitizeGymExerciseMediaForRead,
} from "@/lib/exercises/media-validation";
import { resolveExerciseSource } from "@/lib/exercises/source";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { CustomExerciseDoc, ExerciseCatalogDoc } from "@/lib/firestore/types";

export type GymExerciseMediaReadInput = DocWithId<CustomExerciseDoc>;

function isExerciseMediaResolutionLoggingEnabled(): boolean {
  return process.env.EXERCISE_MEDIA_RESOLUTION_LOG === "true";
}

function logMediaResolution(
  exerciseId: string,
  detail: Record<string, string | boolean | null>,
): void {
  if (!isExerciseMediaResolutionLoggingEnabled()) return;
  const parts = Object.entries(detail)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");
  console.info(`[exercise-media-resolution] exerciseId=${exerciseId} ${parts}`);
}

function pickDemonstrationMedia(
  candidate: ExerciseMediaMetadata,
): ExerciseMediaMetadata {
  if (!hasDemonstrationMedia(candidate)) {
    return emptyExerciseMediaMetadata();
  }
  return candidate;
}

/**
 * Resolves gym exercise demonstration media for member/staff read surfaces.
 * Falls back to platform catalog media when the gym copy is empty but linked
 * (catalogId) or when a starter exercise matches a single active catalog entry by name.
 */
export function resolveGymExerciseMediaForRead(
  doc: GymExerciseMediaReadInput,
  catalogsById: ReadonlyMap<string, DocWithId<ExerciseCatalogDoc>>,
  catalogsByNameLower: ReadonlyMap<string, DocWithId<ExerciseCatalogDoc>>,
): ExerciseMediaMetadata {
  const catalogIdFromDoc = doc.catalogId?.trim() || null;
  const gymMedia = sanitizeGymExerciseMediaForRead(doc.media, {
    gymId: doc.gymId,
    exerciseId: doc.id,
    catalogId: catalogIdFromDoc,
  });

  if (hasDemonstrationMedia(gymMedia)) {
    logMediaResolution(doc.id, {
      source: "gym-doc",
      hasMedia: true,
      catalogId: catalogIdFromDoc,
    });
    return gymMedia;
  }

  const catalogFromId = catalogIdFromDoc
    ? catalogsById.get(catalogIdFromDoc) ?? null
    : null;
  if (catalogFromId?.catalogId) {
    const catalogMedia = sanitizeCatalogExerciseMediaForRead(
      catalogFromId.media,
      catalogFromId.catalogId,
    );
    const resolved = pickDemonstrationMedia(catalogMedia);
    if (hasDemonstrationMedia(resolved)) {
      logMediaResolution(doc.id, {
        source: "catalog-id",
        hasMedia: true,
        catalogId: catalogFromId.catalogId,
      });
      return resolved;
    }
  }

  const source = resolveExerciseSource(doc);
  if (source === "SEEDED" || !catalogIdFromDoc) {
    const nameLower = doc.nameLower?.trim() || doc.name.trim().toLowerCase();
    const catalogFromName = nameLower
      ? catalogsByNameLower.get(nameLower) ?? null
      : null;
    if (catalogFromName?.catalogId) {
      const catalogMedia = sanitizeCatalogExerciseMediaForRead(
        catalogFromName.media,
        catalogFromName.catalogId,
      );
      const resolved = pickDemonstrationMedia(catalogMedia);
      if (hasDemonstrationMedia(resolved)) {
        logMediaResolution(doc.id, {
          source: "catalog-name",
          hasMedia: true,
          catalogId: catalogFromName.catalogId,
          seeded: source === "SEEDED",
        });
        return resolved;
      }
    }
  }

  logMediaResolution(doc.id, {
    source: "none",
    hasMedia: false,
    catalogId: catalogIdFromDoc,
    exerciseSource: source,
  });
  return gymMedia;
}

export function collectCatalogIdsForMediaHydration(
  docs: GymExerciseMediaReadInput[],
): string[] {
  const ids = new Set<string>();
  for (const doc of docs) {
    const catalogId = doc.catalogId?.trim();
    if (catalogId) ids.add(catalogId);
  }
  return [...ids];
}

export function collectNameLowerLookupsForSeededMedia(
  docs: GymExerciseMediaReadInput[],
): string[] {
  const names = new Set<string>();
  for (const doc of docs) {
    const source = resolveExerciseSource(doc);
    if (source !== "SEEDED") continue;
    const nameLower = doc.nameLower?.trim() || doc.name.trim().toLowerCase();
    if (nameLower) names.add(nameLower);
  }
  return [...names];
}
