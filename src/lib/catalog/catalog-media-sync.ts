import { readFileSync } from "node:fs";

import {
  applyCatalogMediaUrl,
  countCatalogMediaObjects,
  extensionFromMediaAssetFilename,
  localCatalogMediaAssetExists,
  populateCatalogMediaFromAssets,
  resolveLocalCatalogMediaAssetPath,
} from "@/lib/catalog/catalog-media-population";
import { completeCatalogMediaUpload } from "@/lib/catalog/catalog-media-storage";
import type {
  CatalogSyncFailureRecord,
  ValidatedCatalogExercise,
} from "@/lib/catalog/types";
import type { ExerciseMediaPose } from "@/lib/exercises/media-paths";
import { ALLOWED_IMAGE_TYPES } from "@/lib/storage/image-validation";

const MEDIA_POSES: ExerciseMediaPose[] = ["primary", "secondary", "thumbnail"];

const EXTENSION_TO_MIME: Record<string, keyof typeof ALLOWED_IMAGE_TYPES> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export type CatalogMediaSyncOptions = {
  exercises: ValidatedCatalogExercise[];
  imagesRoot: string;
  uploadMedia: boolean;
  dryRun: boolean;
};

export type CatalogMediaSyncResult = {
  exercises: ValidatedCatalogExercise[];
  mediaObjectCount: number;
  uploaded: number;
  skipped: number;
  failures: CatalogSyncFailureRecord[];
};

function fileFromLocalAsset(path: string, filename: string): File | null {
  const extension = extensionFromMediaAssetFilename(filename);
  if (!extension) return null;

  const mime = EXTENSION_TO_MIME[extension];
  if (!mime) return null;

  const buffer = readFileSync(path);
  return new File([buffer], filename, { type: mime });
}

export async function syncCatalogMediaAssets(
  options: CatalogMediaSyncOptions,
): Promise<CatalogMediaSyncResult> {
  const failures: CatalogSyncFailureRecord[] = [];
  let uploaded = 0;
  let skipped = 0;
  const nextExercises: ValidatedCatalogExercise[] = [];

  for (const exercise of options.exercises) {
    let media = exercise.media;
    const uploadedUrls: Partial<Record<ExerciseMediaPose, string>> = {};

    for (const pose of MEDIA_POSES) {
      const filename = exercise.mediaAssets?.[pose];
      if (!filename) continue;

      if (
        !localCatalogMediaAssetExists(
          options.imagesRoot,
          exercise.catalogId,
          filename,
        )
      ) {
        skipped += 1;
        failures.push({
          catalogId: exercise.catalogId,
          phase: "media",
          message: `Missing local media asset ${filename} for pose ${pose}.`,
        });
        continue;
      }

      if (options.dryRun || !options.uploadMedia) {
        continue;
      }

      const localPath = resolveLocalCatalogMediaAssetPath(
        options.imagesRoot,
        exercise.catalogId,
        filename,
      );
      const file = fileFromLocalAsset(localPath, filename);
      if (!file) {
        skipped += 1;
        failures.push({
          catalogId: exercise.catalogId,
          phase: "media",
          message: `Unsupported local media asset type for ${filename}.`,
        });
        continue;
      }

      const result = await completeCatalogMediaUpload({
        catalogId: exercise.catalogId,
        pose,
        file,
        existing: media,
      });

      if (!result.ok) {
        skipped += 1;
        failures.push({
          catalogId: exercise.catalogId,
          phase: "media",
          message: result.error,
        });
        continue;
      }

      media = result.media;
      uploadedUrls[pose] = result.url;
      uploaded += 1;
    }

    const populated = populateCatalogMediaFromAssets(
      { ...exercise, media },
      {
        imagesRoot: options.imagesRoot,
        uploadedUrls,
      },
    );
    nextExercises.push(populated);
  }

  if (options.dryRun || !options.uploadMedia) {
    const planned = options.exercises.map((exercise) =>
      populateCatalogMediaFromAssets(exercise, { imagesRoot: options.imagesRoot }),
    );
    return {
      exercises: planned,
      mediaObjectCount: countCatalogMediaObjects(planned),
      uploaded: 0,
      skipped,
      failures,
    };
  }

  return {
    exercises: nextExercises,
    mediaObjectCount: countCatalogMediaObjects(nextExercises),
    uploaded,
    skipped,
    failures,
  };
}
