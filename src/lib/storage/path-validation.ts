const SAFE_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const POSE_PATTERN = /^(primary|secondary|thumbnail)$/;
const TIMESTAMP_PATTERN = /^[0-9]{1,20}$/;

export type StoragePathValidationResult =
  | { ok: true }
  | { ok: false; error: string };

function invalidPath(error: string): StoragePathValidationResult {
  return { ok: false, error };
}

/**
 * Validates storage object keys (without file extension) for public uploads.
 * Approved namespaces: logo uploads, member photos, catalog media, gym exercise media.
 */
export function validatePublicStoragePath(
  pathWithoutExt: string,
): StoragePathValidationResult {
  const trimmed = pathWithoutExt.trim();
  if (!trimmed) {
    return invalidPath("Storage path is required.");
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("\\")) {
    return invalidPath("Storage path must be relative.");
  }
  if (trimmed.includes("..")) {
    return invalidPath("Storage path must not contain path traversal.");
  }
  if (trimmed.includes("\\")) {
    return invalidPath("Storage path must use forward slashes.");
  }
  if (trimmed.includes("//")) {
    return invalidPath("Storage path must not contain empty segments.");
  }

  const segments = trimmed.split("/");
  if (segments.some((segment) => segment.length === 0)) {
    return invalidPath("Storage path must not contain empty segments.");
  }

  if (segments.length === 1 && segments[0]!.startsWith("logo-")) {
    const suffix = segments[0]!.slice("logo-".length);
    if (!TIMESTAMP_PATTERN.test(suffix)) {
      return invalidPath("Invalid gym logo storage path.");
    }
    return { ok: true };
  }

  if (segments.length === 2 && segments[0] === "members") {
    const memberPart = segments[1]!;
    const dashIndex = memberPart.lastIndexOf("-");
    if (dashIndex <= 0) {
      return invalidPath("Invalid member photo storage path.");
    }
    const memberId = memberPart.slice(0, dashIndex);
    const timestamp = memberPart.slice(dashIndex + 1);
    if (
      !SAFE_SEGMENT_PATTERN.test(memberId) ||
      !TIMESTAMP_PATTERN.test(timestamp)
    ) {
      return invalidPath("Invalid member photo storage path.");
    }
    return { ok: true };
  }

  if (segments.length === 3 && segments[0] === "catalog") {
    if (
      !SAFE_SEGMENT_PATTERN.test(segments[1]!) ||
      !POSE_PATTERN.test(segments[2]!)
    ) {
      return invalidPath("Invalid catalog media storage path.");
    }
    return { ok: true };
  }

  if (
    segments.length === 5 &&
    segments[0] === "gyms" &&
    segments[2] === "exercises"
  ) {
    if (
      !SAFE_SEGMENT_PATTERN.test(segments[1]!) ||
      !SAFE_SEGMENT_PATTERN.test(segments[3]!) ||
      !POSE_PATTERN.test(segments[4]!)
    ) {
      return invalidPath("Invalid gym exercise media storage path.");
    }
    return { ok: true };
  }

  return invalidPath("Storage path is not in an approved namespace.");
}

const ALLOWED_OBJECT_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

/** Validates a full storage object path including file extension. */
export function validatePublicStorageObjectPath(
  objectPath: string,
): StoragePathValidationResult {
  const trimmed = objectPath.trim();
  if (!trimmed) {
    return invalidPath("Storage object path is required.");
  }

  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return invalidPath("Storage object path must include a file extension.");
  }

  const extension = trimmed.slice(lastDot + 1).toLowerCase();
  if (!ALLOWED_OBJECT_EXTENSIONS.has(extension)) {
    return invalidPath("Storage object path has an unsupported file extension.");
  }

  return validatePublicStoragePath(trimmed.slice(0, lastDot));
}
