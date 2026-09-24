import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import {
  type ExerciseMediaPose,
  existingMediaUrlForPose,
  gymExerciseMediaStoragePath,
  isUploadedGymExerciseMediaUrl,
  parseOwnedGymExerciseMediaObjectPath,
} from "@/lib/exercises/media-paths";
import { normalizeExerciseMediaMetadata } from "@/lib/exercises/media-validation";
import {
  deletePublicStorageObject,
  uploadPublicStorageImage,
  type UploadResult,
} from "@/lib/storage";

export type GymExerciseMediaUploadParams = {
  gymId: string;
  exerciseId: string;
  pose: ExerciseMediaPose;
  file: File;
};

export type GymExerciseMediaUploadOutcome =
  | {
      ok: true;
      url: string;
      pose: ExerciseMediaPose;
      media: ExerciseMediaMetadata;
    }
  | {
      ok: false;
      error: string;
      cleanupFailed?: boolean;
    };

/**
 * Upload scaffolding for gym-owned exercise demonstration media.
 * Platform catalog media uses separate sync tooling and `catalog/` paths.
 */
export async function uploadGymExerciseDemonstrationImage(
  params: GymExerciseMediaUploadParams,
): Promise<UploadResult> {
  const path = gymExerciseMediaStoragePath(
    params.gymId,
    params.exerciseId,
    params.pose,
  );
  return uploadPublicStorageImage(params.file, path);
}

export function buildGymExerciseMediaMetadataPatch(params: {
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

async function deleteOwnedPreviousObject(
  previousObjectPath: string | null,
  newObjectPath: string,
): Promise<void> {
  if (!previousObjectPath || previousObjectPath === newObjectPath) {
    return;
  }

  await deletePublicStorageObject(previousObjectPath);
}

/**
 * Uploads gym exercise media, validates the returned URL, persists metadata,
 * cleans up orphaned uploads on failure, and removes replaced owned objects
 * only after metadata persistence succeeds.
 */
export async function completeGymExerciseMediaUpload(params: {
  gymId: string;
  exerciseId: string;
  pose: ExerciseMediaPose;
  file: File;
  existing?: ExerciseMediaMetadata | null;
  persistMedia: (media: ExerciseMediaMetadata) => Promise<void>;
}): Promise<GymExerciseMediaUploadOutcome> {
  const upload = await uploadGymExerciseDemonstrationImage(params);
  if ("error" in upload) {
    return { ok: false, error: upload.error };
  }

  if (
    !isUploadedGymExerciseMediaUrl(upload.url, {
      gymId: params.gymId,
      exerciseId: params.exerciseId,
      pose: params.pose,
    })
  ) {
    const cleanedUp = await cleanupUploadedObject(upload.objectPath);
    return {
      ok: false,
      error: cleanedUp
        ? "Uploaded media URL failed security validation. The image was not saved."
        : "Uploaded media URL failed security validation and cleanup may require attention.",
      cleanupFailed: !cleanedUp,
    };
  }

  const mediaPatch = buildGymExerciseMediaMetadataPatch({
    pose: params.pose,
    publicUrl: upload.url,
    existing: params.existing,
  });

  const previousUrl = existingMediaUrlForPose(params.existing, params.pose);
  const previousObjectPath = parseOwnedGymExerciseMediaObjectPath(
    previousUrl,
    params.gymId,
    params.exerciseId,
  );

  try {
    await params.persistMedia(mediaPatch);
  } catch {
    const cleanedUp = await cleanupUploadedObject(upload.objectPath);
    return {
      ok: false,
      error: cleanedUp
        ? "Exercise media uploaded but could not be saved. The upload was removed."
        : "Exercise media uploaded but could not be saved. Storage cleanup may require attention.",
      cleanupFailed: !cleanedUp,
    };
  }

  await deleteOwnedPreviousObject(previousObjectPath, upload.objectPath);

  return {
    ok: true,
    url: upload.url,
    pose: params.pose,
    media: mediaPatch,
  };
}
