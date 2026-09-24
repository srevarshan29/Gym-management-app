import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import {
  type ExerciseMediaPose,
  catalogMediaStoragePath,
  isScopedCatalogExerciseMediaUrl,
} from "@/lib/exercises/media-paths";
import { normalizeExerciseMediaMetadata } from "@/lib/exercises/media-validation";
import {
  deletePublicStorageObject,
  uploadPublicStorageImage,
  type UploadResult,
} from "@/lib/storage";

export type CatalogMediaUploadParams = {
  catalogId: string;
  pose: ExerciseMediaPose;
  file: File;
};

export type CatalogMediaUploadOutcome =
  | {
      ok: true;
      url: string;
      objectPath: string;
      pose: ExerciseMediaPose;
      media: ExerciseMediaMetadata;
    }
  | {
      ok: false;
      error: string;
      cleanupFailed?: boolean;
    };

/** Upload scaffolding for platform catalog demonstration media. */
export async function uploadCatalogDemonstrationImage(
  params: CatalogMediaUploadParams,
): Promise<UploadResult> {
  const path = catalogMediaStoragePath(params.catalogId, params.pose);
  return uploadPublicStorageImage(params.file, path);
}

export function buildCatalogExerciseMediaMetadataPatch(params: {
  pose: ExerciseMediaPose;
  publicUrl: string;
  existing?: ExerciseMediaMetadata | null;
}): ExerciseMediaMetadata {
  const base = normalizeExerciseMediaMetadata(params.existing);
  switch (params.pose) {
    case "primary":
      return { ...base, primaryImageUrl: params.publicUrl };
    case "secondary":
      return { ...base, secondaryImageUrl: params.publicUrl };
    case "thumbnail":
      return { ...base, thumbnailUrl: params.publicUrl };
    default:
      return base;
  }
}

async function cleanupUploadedObject(objectPath: string): Promise<boolean> {
  const deleted = await deletePublicStorageObject(objectPath);
  return deleted.ok;
}

/**
 * Uploads catalog media, validates the returned URL scope, and returns a
 * metadata patch. Does not persist to Firestore — callers own persistence.
 */
export async function completeCatalogMediaUpload(params: {
  catalogId: string;
  pose: ExerciseMediaPose;
  file: File;
  existing?: ExerciseMediaMetadata | null;
}): Promise<CatalogMediaUploadOutcome> {
  const upload = await uploadCatalogDemonstrationImage(params);
  if ("error" in upload) {
    return { ok: false, error: upload.error };
  }

  if (!isScopedCatalogExerciseMediaUrl(upload.url, params.catalogId, params.pose)) {
    const cleanedUp = await cleanupUploadedObject(upload.objectPath);
    return {
      ok: false,
      error: cleanedUp
        ? "Uploaded catalog media URL failed security validation."
        : "Uploaded catalog media URL failed security validation and cleanup may require attention.",
      cleanupFailed: !cleanedUp,
    };
  }

  return {
    ok: true,
    url: upload.url,
    objectPath: upload.objectPath,
    pose: params.pose,
    media: buildCatalogExerciseMediaMetadataPatch({
      pose: params.pose,
      publicUrl: upload.url,
      existing: params.existing,
    }),
  };
}
