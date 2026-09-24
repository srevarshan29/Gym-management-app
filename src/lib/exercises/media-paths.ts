import type { ExerciseMediaMetadata } from "@/lib/exercises/catalog-types";

/** Platform-scoped catalog demonstration media (synced from catalog bundle). */
export const CATALOG_MEDIA_ROOT = "catalog";

/** Gym-scoped custom exercise demonstration media. */
export const GYM_EXERCISE_MEDIA_ROOT = "gyms";

export type ExerciseMediaPose = "primary" | "secondary" | "thumbnail";

const SAFE_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export function assertSafeStorageSegment(
  value: string,
  label: string,
): string {
  const trimmed = value.trim();
  if (!SAFE_SEGMENT_PATTERN.test(trimmed)) {
    throw new Error(`${label} contains invalid characters.`);
  }
  if (trimmed.includes("..")) {
    throw new Error(`${label} must not contain path traversal.`);
  }
  return trimmed;
}

/** Storage object path without file extension, e.g. catalog/dev-push-up/primary */
export function catalogMediaStoragePath(
  catalogId: string,
  pose: ExerciseMediaPose,
): string {
  const safeCatalogId = assertSafeStorageSegment(catalogId, "catalogId");
  return `${CATALOG_MEDIA_ROOT}/${safeCatalogId}/${pose}`;
}

/** Storage object path without file extension for gym-owned exercise media. */
export function gymExerciseMediaStoragePath(
  gymId: string,
  exerciseId: string,
  pose: ExerciseMediaPose,
): string {
  const safeGymId = assertSafeStorageSegment(gymId, "gymId");
  const safeExerciseId = assertSafeStorageSegment(exerciseId, "exerciseId");
  return `${GYM_EXERCISE_MEDIA_ROOT}/${safeGymId}/exercises/${safeExerciseId}/${pose}`;
}

export type SupabaseStorageUrlConfig = {
  host: string;
  bucket: string;
};

export type SupabasePublicStorageUrlParseResult =
  | { ok: true; objectPath: string }
  | { ok: false; reason: string };

export function getSupabaseStorageUrlConfig(): SupabaseStorageUrlConfig | null {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  if (!supabaseUrl) return null;

  try {
    return {
      host: new URL(supabaseUrl).host,
      bucket: process.env.SUPABASE_STORAGE_BUCKET?.trim() || "gym-assets",
    };
  } catch {
    return null;
  }
}

export function parseSupabasePublicStorageUrl(
  url: string,
): SupabasePublicStorageUrlParseResult {
  const config = getSupabaseStorageUrlConfig();
  if (!config) {
    return {
      ok: false,
      reason: "Storage URL validation is not configured.",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { ok: false, reason: "Invalid URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "URL must use http or https." };
  }

  if (parsed.host !== config.host) {
    return { ok: false, reason: "URL host does not match configured storage." };
  }

  const prefix = `/storage/v1/object/public/${config.bucket}/`;
  if (!parsed.pathname.startsWith(prefix)) {
    return { ok: false, reason: "URL is not a public storage object URL." };
  }

  const encodedObjectPath = parsed.pathname.slice(prefix.length);
  if (!encodedObjectPath || encodedObjectPath.includes("..")) {
    return { ok: false, reason: "Invalid storage object path." };
  }

  let objectPath: string;
  try {
    objectPath = decodeURIComponent(encodedObjectPath);
  } catch {
    return { ok: false, reason: "Invalid storage object path." };
  }

  if (
    objectPath.startsWith("/") ||
    objectPath.includes("\\") ||
    objectPath.includes("//")
  ) {
    return { ok: false, reason: "Invalid storage object path." };
  }

  return { ok: true, objectPath };
}

export function getPublicUrlPathname(url: string): string | null {
  const parsed = parseSupabasePublicStorageUrl(url);
  if (!parsed.ok) return null;
  return `/storage/v1/object/public/${getSupabaseStorageUrlConfig()?.bucket ?? "gym-assets"}/${parsed.objectPath}`;
}

function objectPathMatchesPrefix(objectPath: string, prefix: string): boolean {
  if (!objectPath.startsWith(`${prefix}/`)) {
    return objectPath === prefix;
  }
  return true;
}

/** True when a public URL points at platform catalog media (not gym-private paths). */
export function isCatalogScopedMediaUrl(url: string): boolean {
  const parsed = parseSupabasePublicStorageUrl(url);
  if (!parsed.ok) return false;
  return objectPathMatchesPrefix(parsed.objectPath, CATALOG_MEDIA_ROOT);
}

/** True when a public URL points at a specific gym's exercise media prefix. */
export function isGymExerciseScopedMediaUrl(url: string, gymId: string): boolean {
  const parsed = parseSupabasePublicStorageUrl(url);
  if (!parsed.ok) return false;

  let safeGymId: string;
  try {
    safeGymId = assertSafeStorageSegment(gymId, "gymId");
  } catch {
    return false;
  }

  const expectedPrefix = `${GYM_EXERCISE_MEDIA_ROOT}/${safeGymId}/exercises`;
  return objectPathMatchesPrefix(parsed.objectPath, expectedPrefix);
}

/** Catalog metadata URLs must not reference another gym's private storage prefix. */
export function isCatalogMetadataUrlAllowed(url: string | null | undefined): boolean {
  if (url == null || url.trim() === "") return true;

  const parsed = parseSupabasePublicStorageUrl(url.trim());
  if (!parsed.ok) return false;
  if (objectPathMatchesPrefix(parsed.objectPath, GYM_EXERCISE_MEDIA_ROOT)) {
    return false;
  }
  return objectPathMatchesPrefix(parsed.objectPath, CATALOG_MEDIA_ROOT);
}

function objectPathUsesAllowedImageExtension(objectPath: string, expectedBase: string): boolean {
  if (!objectPath.startsWith(`${expectedBase}.`)) {
    return false;
  }

  const extension = objectPath.slice(expectedBase.length + 1);
  if (!extension || extension.includes("/") || extension.includes(".")) {
    return false;
  }

  return ALLOWED_IMAGE_EXTENSIONS.has(extension.toLowerCase());
}

export function isUploadedGymExerciseMediaUrl(
  url: string,
  params: {
    gymId: string;
    exerciseId: string;
    pose: ExerciseMediaPose;
  },
): boolean {
  const parsed = parseSupabasePublicStorageUrl(url);
  if (!parsed.ok) return false;

  const expectedBase = gymExerciseMediaStoragePath(
    params.gymId,
    params.exerciseId,
    params.pose,
  );

  return objectPathUsesAllowedImageExtension(parsed.objectPath, expectedBase);
}

/** True when a public URL points at an exact catalog exercise media object. */
export function isScopedCatalogExerciseMediaUrl(
  url: string,
  catalogId: string,
  pose: ExerciseMediaPose,
): boolean {
  const parsed = parseSupabasePublicStorageUrl(url);
  if (!parsed.ok) return false;

  const expectedBase = catalogMediaStoragePath(catalogId, pose);
  if (!objectPathUsesAllowedImageExtension(parsed.objectPath, expectedBase)) {
    return false;
  }

  return !objectPathMatchesPrefix(parsed.objectPath, GYM_EXERCISE_MEDIA_ROOT);
}

/**
 * Structural read-time guard: configured Supabase public object with a known
 * catalog or gym exercise media shape and allowed image extension.
 */
export function isStructuredExerciseMediaUrl(url: string): boolean {
  const parsed = parseSupabasePublicStorageUrl(url);
  if (!parsed.ok) return false;

  const catalogMatch = parsed.objectPath.match(
    /^catalog\/([^/]+)\/(primary|secondary|thumbnail)\.([a-z0-9]+)$/i,
  );
  if (catalogMatch) {
    return ALLOWED_IMAGE_EXTENSIONS.has(catalogMatch[3]!.toLowerCase());
  }

  const gymMatch = parsed.objectPath.match(
    /^gyms\/([^/]+)\/exercises\/([^/]+)\/(primary|secondary|thumbnail)\.([a-z0-9]+)$/i,
  );
  if (gymMatch) {
    return ALLOWED_IMAGE_EXTENSIONS.has(gymMatch[4]!.toLowerCase());
  }

  return false;
}

/** Parses a gym-owned exercise media URL into its storage object path when valid. */
export function parseOwnedGymExerciseMediaObjectPath(
  url: string | null | undefined,
  gymId: string,
  exerciseId: string,
): string | null {
  if (url == null || url.trim() === "") {
    return null;
  }

  const parsed = parseSupabasePublicStorageUrl(url.trim());
  if (!parsed.ok) {
    return null;
  }

  let safeGymId: string;
  let safeExerciseId: string;
  try {
    safeGymId = assertSafeStorageSegment(gymId, "gymId");
    safeExerciseId = assertSafeStorageSegment(exerciseId, "exerciseId");
  } catch {
    return null;
  }

  const expectedPrefix = `${GYM_EXERCISE_MEDIA_ROOT}/${safeGymId}/exercises/${safeExerciseId}/`;
  if (!parsed.objectPath.startsWith(expectedPrefix)) {
    return null;
  }

  const remainder = parsed.objectPath.slice(expectedPrefix.length);
  if (!/^(primary|secondary|thumbnail)\.[a-z0-9]+$/i.test(remainder)) {
    return null;
  }

  return parsed.objectPath;
}

/** Builds the expected public URL for a catalog media object when storage is configured. */
export function buildPublicCatalogMediaUrl(
  catalogId: string,
  pose: ExerciseMediaPose,
  extension: string,
): string | null {
  const config = getSupabaseStorageUrlConfig();
  if (!config) return null;

  const safeExtension = extension.toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(safeExtension)) {
    return null;
  }

  const objectPath = `${catalogMediaStoragePath(catalogId, pose)}.${safeExtension}`;
  return `https://${config.host}/storage/v1/object/public/${config.bucket}/${objectPath}`;
}

export function existingMediaUrlForPose(
  media: ExerciseMediaMetadata | null | undefined,
  pose: ExerciseMediaPose,
): string | null {
  if (!media) return null;
  switch (pose) {
    case "primary":
      return media.primaryImageUrl ?? null;
    case "secondary":
      return media.secondaryImageUrl ?? null;
    case "thumbnail":
      return media.thumbnailUrl ?? null;
    default:
      return null;
  }
}
