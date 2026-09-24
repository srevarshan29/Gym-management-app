import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";
import type { ExerciseMediaPose } from "@/lib/exercises/media-paths";
import {
  isCatalogMetadataUrlAllowed,
  isCatalogScopedMediaUrl,
  isGymExerciseScopedMediaUrl,
  isScopedCatalogExerciseMediaUrl,
  isStructuredExerciseMediaUrl,
  isUploadedGymExerciseMediaUrl,
} from "@/lib/exercises/media-paths";
import {
  MAX_IMAGE_BYTES,
  validateImageUploadFile,
} from "@/lib/storage/image-validation";

export { MAX_IMAGE_BYTES, validateImageUploadFile };

export function isValidExerciseImageUrl(url: string | null | undefined): boolean {
  if (url == null) return false;
  const trimmed = url.trim();
  if (trimmed === "") return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function emptyExerciseMediaMetadata(): ExerciseMediaMetadata {
  return {
    primaryImageUrl: null,
    secondaryImageUrl: null,
    thumbnailUrl: null,
    animationUrl: null,
    videoUrl: null,
  };
}

export function normalizeExerciseMediaMetadata(
  media?: Partial<ExerciseMediaMetadata> | null,
): ExerciseMediaMetadata {
  const base = emptyExerciseMediaMetadata();
  if (!media) return base;

  return {
    primaryImageUrl: normalizeOptionalUrl(media.primaryImageUrl),
    secondaryImageUrl: normalizeOptionalUrl(media.secondaryImageUrl),
    thumbnailUrl: normalizeOptionalUrl(media.thumbnailUrl),
    animationUrl: null,
    videoUrl: null,
  };
}

function normalizeOptionalUrl(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function sanitizeScopedMediaUrl(
  url: string | null,
  isAllowed: (url: string) => boolean,
): string | null {
  if (url == null) return null;
  return isAllowed(url) ? url : null;
}

function sanitizeCatalogScopedMediaForRead(
  media: ExerciseMediaMetadata,
  catalogId: string,
): ExerciseMediaMetadata {
  const validatePose = (pose: ExerciseMediaPose) => (url: string) =>
    isScopedCatalogExerciseMediaUrl(url, catalogId, pose);

  return {
    ...media,
    primaryImageUrl: sanitizeScopedMediaUrl(
      media.primaryImageUrl,
      validatePose("primary"),
    ),
    secondaryImageUrl: sanitizeScopedMediaUrl(
      media.secondaryImageUrl,
      validatePose("secondary"),
    ),
    thumbnailUrl: sanitizeScopedMediaUrl(
      media.thumbnailUrl,
      validatePose("thumbnail"),
    ),
  };
}

function sanitizeGymOwnedMediaForRead(
  media: ExerciseMediaMetadata,
  gymId: string,
  exerciseId: string,
): ExerciseMediaMetadata {
  const validatePose = (pose: ExerciseMediaPose) => (url: string) =>
    isUploadedGymExerciseMediaUrl(url, { gymId, exerciseId, pose });

  return {
    ...media,
    primaryImageUrl: sanitizeScopedMediaUrl(
      media.primaryImageUrl,
      validatePose("primary"),
    ),
    secondaryImageUrl: sanitizeScopedMediaUrl(
      media.secondaryImageUrl,
      validatePose("secondary"),
    ),
    thumbnailUrl: sanitizeScopedMediaUrl(
      media.thumbnailUrl,
      validatePose("thumbnail"),
    ),
  };
}

/** Strict read-time sanitization for gym library / workout surfaces. */
export function sanitizeGymExerciseMediaForRead(
  media: Partial<ExerciseMediaMetadata> | null | undefined,
  context: {
    gymId: string;
    exerciseId: string;
    catalogId?: string | null;
  },
): ExerciseMediaMetadata {
  const normalized = normalizeExerciseMediaMetadata(media);

  if (context.catalogId) {
    return sanitizeCatalogScopedMediaForRead(normalized, context.catalogId);
  }

  return sanitizeGymOwnedMediaForRead(
    normalized,
    context.gymId,
    context.exerciseId,
  );
}

/** Strict read-time sanitization for staff catalog browse surfaces. */
export function sanitizeCatalogExerciseMediaForRead(
  media: Partial<ExerciseMediaMetadata> | null | undefined,
  catalogId: string,
): ExerciseMediaMetadata {
  return sanitizeCatalogScopedMediaForRead(
    normalizeExerciseMediaMetadata(media),
    catalogId,
  );
}

function isDisplayableExerciseMediaUrl(url: string | null | undefined): boolean {
  if (url == null) return false;
  const trimmed = url.trim();
  if (trimmed === "") return false;
  return isStructuredExerciseMediaUrl(trimmed);
}

export type ExerciseMediaValidationResult =
  | { ok: true; media: ExerciseMediaMetadata }
  | { ok: false; errors: string[] };

export function validateExerciseMediaMetadata(
  media: unknown,
  options?: { catalogScope?: boolean },
): ExerciseMediaValidationResult {
  if (media == null) {
    return { ok: true, media: emptyExerciseMediaMetadata() };
  }

  if (typeof media !== "object" || Array.isArray(media)) {
    return { ok: false, errors: ["media must be an object."] };
  }

  const input = media as Partial<ExerciseMediaMetadata>;
  const errors: string[] = [];

  const normalized = normalizeExerciseMediaMetadata(input);

  for (const [field, value] of Object.entries({
    primaryImageUrl: normalized.primaryImageUrl,
    secondaryImageUrl: normalized.secondaryImageUrl,
    thumbnailUrl: normalized.thumbnailUrl,
  })) {
    if (value != null && !isValidExerciseImageUrl(value)) {
      errors.push(`${field} must be a valid http(s) URL or null.`);
    }
  }

  if (input.animationUrl != null && input.animationUrl !== null) {
    errors.push("animationUrl is reserved and must be null in v1.");
  }
  if (input.videoUrl != null && input.videoUrl !== null) {
    errors.push("videoUrl is reserved and must be null in v1.");
  }

  if (options?.catalogScope) {
    for (const field of [
      "primaryImageUrl",
      "secondaryImageUrl",
      "thumbnailUrl",
    ] as const) {
      const value = normalized[field];
      if (value && !isCatalogMetadataUrlAllowed(value)) {
        errors.push(`${field} must use platform catalog media URLs.`);
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, media: normalized };
}

/** Preferred still image for lists (thumbnail, then primary). */
export function resolveListPreviewImageUrl(
  media?: ExerciseMediaMetadata | null,
): string | null {
  if (!media) return null;
  if (isDisplayableExerciseMediaUrl(media.thumbnailUrl)) return media.thumbnailUrl;
  if (isDisplayableExerciseMediaUrl(media.primaryImageUrl)) return media.primaryImageUrl;
  if (isDisplayableExerciseMediaUrl(media.secondaryImageUrl)) return media.secondaryImageUrl;
  return null;
}

/** Preferred full demonstration still (primary, then secondary). */
export function resolveDemonstrationImageUrl(
  media?: ExerciseMediaMetadata | null,
): string | null {
  if (!media) return null;
  if (isDisplayableExerciseMediaUrl(media.primaryImageUrl)) return media.primaryImageUrl;
  if (isDisplayableExerciseMediaUrl(media.secondaryImageUrl)) return media.secondaryImageUrl;
  return null;
}

/** Secondary fallback when primary fails to load. */
export function resolveSecondaryDemonstrationImageUrl(
  media?: ExerciseMediaMetadata | null,
  excludeUrl?: string | null,
): string | null {
  if (!media) return null;
  const secondary = media.secondaryImageUrl;
  if (!isDisplayableExerciseMediaUrl(secondary)) return null;
  if (excludeUrl && secondary === excludeUrl) return null;
  return secondary;
}

export function assertGymExerciseMediaUrl(
  url: string,
  gymId: string,
): boolean {
  return isValidExerciseImageUrl(url) && isGymExerciseScopedMediaUrl(url, gymId);
}

export function assertCatalogExerciseMediaUrl(url: string): boolean {
  return isValidExerciseImageUrl(url) && isCatalogScopedMediaUrl(url);
}
