import type { ExerciseProvider } from "@/lib/exercises/catalog-types";
import type { CatalogManifest } from "@/lib/catalog/types";

const PROVIDER_VALUES = ["repdb", "custom", "gym"] as const satisfies readonly ExerciseProvider[];

const CATALOG_VERSION_PATTERN = /^[a-z0-9][a-z0-9._-]{0,79}$/i;

export type ManifestValidationResult =
  | { ok: true; manifest: CatalogManifest }
  | { ok: false; errors: string[] };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isProvider(value: unknown): value is ExerciseProvider {
  return (
    typeof value === "string" &&
    (PROVIDER_VALUES as readonly string[]).includes(value)
  );
}

function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

export function validateCatalogManifest(input: unknown): ManifestValidationResult {
  const errors: string[] = [];

  if (input == null || typeof input !== "object") {
    return { ok: false, errors: ["Manifest must be a JSON object."] };
  }

  const raw = input as Record<string, unknown>;

  if (!isNonEmptyString(raw.catalogVersion)) {
    errors.push("manifest.catalogVersion is required.");
  } else if (!CATALOG_VERSION_PATTERN.test(raw.catalogVersion.trim())) {
    errors.push("manifest.catalogVersion has an invalid format.");
  }

  if (!isProvider(raw.provider)) {
    errors.push("manifest.provider must be repdb, custom, or gym.");
  }

  if (
    typeof raw.exerciseCount !== "number" ||
    !Number.isInteger(raw.exerciseCount) ||
    raw.exerciseCount < 0
  ) {
    errors.push("manifest.exerciseCount must be a non-negative integer.");
  }

  if (!isSha256Hex(raw.sha256OfJson)) {
    errors.push("manifest.sha256OfJson must be a 64-character SHA-256 hex digest.");
  }

  if (raw.syncedAt !== null && raw.syncedAt !== undefined) {
    if (typeof raw.syncedAt !== "string" || Number.isNaN(Date.parse(raw.syncedAt))) {
      errors.push("manifest.syncedAt must be null or an ISO-8601 timestamp string.");
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    manifest: {
      catalogVersion: (raw.catalogVersion as string).trim(),
      provider: raw.provider as ExerciseProvider,
      exerciseCount: raw.exerciseCount as number,
      sha256OfJson: (raw.sha256OfJson as string).toLowerCase(),
      syncedAt:
        raw.syncedAt === undefined || raw.syncedAt === null
          ? null
          : (raw.syncedAt as string),
    },
  };
}

export function validateManifestExerciseCount(
  manifest: CatalogManifest,
  actualCount: number,
): string | null {
  if (manifest.exerciseCount !== actualCount) {
    return `manifest.exerciseCount (${manifest.exerciseCount}) does not match exercises.json length (${actualCount}).`;
  }
  return null;
}

export function validateManifestSha256(
  manifest: CatalogManifest,
  actualSha256: string,
): string | null {
  const expected = manifest.sha256OfJson.toLowerCase();
  const actual = actualSha256.toLowerCase();
  if (expected !== actual) {
    return `manifest.sha256OfJson (${expected}) does not match computed SHA-256 (${actual}).`;
  }
  return null;
}
