import { existsSync } from "node:fs";
import { basename, join } from "node:path";

import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import {
  type ExerciseMediaPose,
  buildPublicCatalogMediaUrl,
  isScopedCatalogExerciseMediaUrl,
} from "@/lib/exercises/media-paths";
import { emptyExerciseMediaMetadata } from "@/lib/exercises/media-validation";
import type { ValidatedCatalogExercise } from "@/lib/catalog/types";

const MEDIA_POSES: ExerciseMediaPose[] = ["primary", "secondary", "thumbnail"];

export function collectMissingCatalogMediaAssetErrors(
  exercises: ValidatedCatalogExercise[],
  imagesRoot: string,
): string[] {
  const errors: string[] = [];

  for (const exercise of exercises) {
    const assets = exercise.mediaAssets;
    if (!assets) continue;

    for (const pose of MEDIA_POSES) {
      const filename = assets[pose];
      if (!filename) continue;

      if (!localCatalogMediaAssetExists(imagesRoot, exercise.catalogId, filename)) {
        errors.push(
          `[media] ${exercise.catalogId}: Missing local media asset ${filename} for pose ${pose}.`,
        );
      }
    }
  }

  return errors;
}

const SAFE_MEDIA_ASSET_FILENAME =
  /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i;

export type CatalogMediaAssetMap = Partial<
  Record<ExerciseMediaPose, string>
>;

export function isSafeCatalogMediaAssetFilename(filename: string): boolean {
  const trimmed = filename.trim();
  if (!trimmed || trimmed !== basename(trimmed)) {
    return false;
  }
  return SAFE_MEDIA_ASSET_FILENAME.test(trimmed);
}

export function validateCatalogMediaAssets(
  value: unknown,
): { ok: true; assets: CatalogMediaAssetMap | null } | { ok: false; error: string } {
  if (value == null) {
    return { ok: true, assets: null };
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "mediaAssets must be an object or null." };
  }

  const assets: CatalogMediaAssetMap = {};
  for (const [key, rawFilename] of Object.entries(value)) {
    if (!MEDIA_POSES.includes(key as ExerciseMediaPose)) {
      return { ok: false, error: `mediaAssets.${key} is not a supported pose.` };
    }
    if (typeof rawFilename !== "string") {
      return { ok: false, error: `mediaAssets.${key} must be a string.` };
    }
    if (!isSafeCatalogMediaAssetFilename(rawFilename)) {
      return {
        ok: false,
        error: `mediaAssets.${key} must be a safe image filename.`,
      };
    }
    assets[key as ExerciseMediaPose] = rawFilename.trim();
  }

  return { ok: true, assets: Object.keys(assets).length > 0 ? assets : null };
}

export function extensionFromMediaAssetFilename(filename: string): string | null {
  const match = filename.trim().match(/\.([a-z0-9]+)$/i);
  if (!match) return null;
  return match[1]!.toLowerCase();
}

export function resolveLocalCatalogMediaAssetPath(
  imagesRoot: string,
  catalogId: string,
  filename: string,
): string {
  return join(imagesRoot, catalogId, filename);
}

export function localCatalogMediaAssetExists(
  imagesRoot: string,
  catalogId: string,
  filename: string,
): boolean {
  if (!isSafeCatalogMediaAssetFilename(filename)) {
    return false;
  }
  return existsSync(resolveLocalCatalogMediaAssetPath(imagesRoot, catalogId, filename));
}

/** Counts scoped catalog media object URLs present on validated exercises. */
export function countCatalogMediaObjects(
  exercises: ValidatedCatalogExercise[],
): number {
  let count = 0;
  for (const exercise of exercises) {
    for (const pose of MEDIA_POSES) {
      const url = urlForPose(exercise.media, pose);
      if (
        url &&
        isScopedCatalogExerciseMediaUrl(url, exercise.catalogId, pose)
      ) {
        count += 1;
      }
    }
  }
  return count;
}

function urlForPose(
  media: ExerciseMediaMetadata,
  pose: ExerciseMediaPose,
): string | null {
  switch (pose) {
    case "primary":
      return media.primaryImageUrl;
    case "secondary":
      return media.secondaryImageUrl;
    case "thumbnail":
      return media.thumbnailUrl;
    default:
      return null;
  }
}

export function applyCatalogMediaUrl(
  media: ExerciseMediaMetadata,
  pose: ExerciseMediaPose,
  publicUrl: string,
): ExerciseMediaMetadata {
  switch (pose) {
    case "primary":
      return { ...media, primaryImageUrl: publicUrl };
    case "secondary":
      return { ...media, secondaryImageUrl: publicUrl };
    case "thumbnail":
      return { ...media, thumbnailUrl: publicUrl };
    default:
      return media;
  }
}

/**
 * Resolves expected public URLs for local bundle assets without uploading.
 * Used by dry-run sync planning and tests.
 */
export function populateCatalogMediaFromAssets(
  exercise: ValidatedCatalogExercise,
  options: {
    imagesRoot: string;
    uploadedUrls?: Partial<Record<ExerciseMediaPose, string>>;
  },
): ValidatedCatalogExercise {
  let media = exercise.media ?? emptyExerciseMediaMetadata();
  const assets = exercise.mediaAssets;
  if (!assets && !options.uploadedUrls) {
    return { ...exercise, media };
  }

  for (const pose of MEDIA_POSES) {
    const uploadedUrl = options.uploadedUrls?.[pose];
    if (uploadedUrl) {
      if (isScopedCatalogExerciseMediaUrl(uploadedUrl, exercise.catalogId, pose)) {
        media = applyCatalogMediaUrl(media, pose, uploadedUrl);
      }
      continue;
    }

    const filename = assets?.[pose];
    if (!filename) continue;
    if (!localCatalogMediaAssetExists(options.imagesRoot, exercise.catalogId, filename)) {
      continue;
    }

    const extension = extensionFromMediaAssetFilename(filename);
    if (!extension) continue;

    const expectedUrl = buildPublicCatalogMediaUrl(
      exercise.catalogId,
      pose,
      extension,
    );
    if (
      expectedUrl &&
      isScopedCatalogExerciseMediaUrl(expectedUrl, exercise.catalogId, pose)
    ) {
      media = applyCatalogMediaUrl(media, pose, expectedUrl);
    }
  }

  return { ...exercise, media };
}
