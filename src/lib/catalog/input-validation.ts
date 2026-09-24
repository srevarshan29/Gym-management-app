import {
  buildCatalogSearchPrefixes,
  normalizeCatalogName,
} from "@/lib/exercises/catalog-search";
import type {
  ExerciseDifficulty,
  ExerciseMediaMetadata,
  ExerciseProviderMetadata,
} from "@/lib/exercises/catalog-types";
import {
  CATALOG_ID_MAX_LENGTH,
  CATALOG_ID_MIN_LENGTH,
  isValidCatalogId,
} from "@/lib/catalog/catalog-id";
import type {
  CatalogExerciseInput,
  ValidatedCatalogExercise,
} from "@/lib/catalog/types";
import {
  emptyExerciseMediaMetadata,
  validateExerciseMediaMetadata,
} from "@/lib/exercises/media-validation";
import { validateCatalogMediaAssets } from "@/lib/catalog/catalog-media-population";
import { MUSCLE_GROUP_VALUES, type MuscleGroup } from "@/lib/muscle-groups";

const DIFFICULTY_VALUES = [
  "beginner",
  "intermediate",
  "advanced",
] as const satisfies readonly ExerciseDifficulty[];

const PROVIDER_VALUES = ["repdb", "custom", "gym"] as const;

export type CatalogInputValidationResult =
  | { ok: true; exercise: ValidatedCatalogExercise; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isMuscleGroup(value: unknown): value is MuscleGroup {
  return (
    typeof value === "string" &&
    (MUSCLE_GROUP_VALUES as readonly string[]).includes(value)
  );
}

function isDifficulty(value: unknown): value is ExerciseDifficulty | null {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" &&
      (DIFFICULTY_VALUES as readonly string[]).includes(value))
  );
}

function validateCatalogMedia(
  value: unknown,
  errors: string[],
  label: string,
): ExerciseMediaMetadata {
  if (value != null && (typeof value !== "object" || Array.isArray(value))) {
    errors.push(`${label}.media must be an object or null.`);
    return emptyExerciseMediaMetadata();
  }

  const result = validateExerciseMediaMetadata(value, { catalogScope: true });
  if (!result.ok) {
    for (const error of result.errors) {
      errors.push(`${label}.media: ${error}`);
    }
    return emptyExerciseMediaMetadata();
  }
  return result.media;
}

function normalizeProvider(
  value: unknown,
  manifestProvider: ExerciseProviderMetadata["provider"],
  errors: string[],
): ExerciseProviderMetadata {
  if (value == null || typeof value !== "object") {
    return {
      provider: manifestProvider,
      providerExerciseId: null,
      attributionText: null,
      attributionUrl: null,
      licenseTier: null,
    };
  }

  const provider = value as Record<string, unknown>;
  const providerName =
    provider.provider === undefined
      ? manifestProvider
      : provider.provider;

  if (
    typeof providerName !== "string" ||
    !(PROVIDER_VALUES as readonly string[]).includes(providerName)
  ) {
    errors.push("provider.provider must be repdb, custom, or gym.");
  }

  const nullableString = (field: string): string | null => {
    const raw = provider[field];
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== "string") {
      errors.push(`provider.${field} must be a string or null.`);
      return null;
    }
    return raw;
  };

  return {
    provider: providerName as ExerciseProviderMetadata["provider"],
    providerExerciseId: nullableString("providerExerciseId"),
    attributionText: nullableString("attributionText"),
    attributionUrl: nullableString("attributionUrl"),
    licenseTier: nullableString("licenseTier"),
  };
}

type ExerciseProviderName = ExerciseProviderMetadata["provider"];

export function validateCatalogExerciseInput(
  input: unknown,
  options: {
    catalogVersion: string;
    manifestProvider: ExerciseProviderName;
    index: number;
  },
): CatalogInputValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const label = `exercises[${options.index}]`;

  if (input == null || typeof input !== "object") {
    return {
      ok: false,
      errors: [`${label} must be an object.`],
      warnings,
    };
  }

  const raw = input as Record<string, unknown>;

  if (!isNonEmptyString(raw.catalogId)) {
    errors.push(`${label}.catalogId is required.`);
  } else if (!isValidCatalogId(raw.catalogId)) {
    errors.push(
      `${label}.catalogId must be ${CATALOG_ID_MIN_LENGTH}-${CATALOG_ID_MAX_LENGTH} chars and match slug format [a-z0-9-].`,
    );
  }

  if (!isNonEmptyString(raw.name)) {
    errors.push(`${label}.name is required.`);
  }

  if (!isMuscleGroup(raw.muscleGroup)) {
    errors.push(`${label}.muscleGroup must be a valid muscle group.`);
  }

  if (!isStringArray(raw.instructions) || raw.instructions.length === 0) {
    errors.push(`${label}.instructions must be a non-empty string array.`);
  }

  if (!isDifficulty(raw.difficulty)) {
    errors.push(
      `${label}.difficulty must be beginner, intermediate, advanced, or null.`,
    );
  }

  if (raw.primaryMuscles !== undefined && !isStringArray(raw.primaryMuscles)) {
    errors.push(`${label}.primaryMuscles must be an array of strings.`);
  }

  if (
    raw.secondaryMuscles !== undefined &&
    raw.secondaryMuscles !== null &&
    !isStringArray(raw.secondaryMuscles)
  ) {
    errors.push(`${label}.secondaryMuscles must be an array of strings or null.`);
  }

  if (raw.tips !== undefined && raw.tips !== null && !isStringArray(raw.tips)) {
    errors.push(`${label}.tips must be an array of strings or null.`);
  }

  if (
    raw.safetyNotes !== undefined &&
    raw.safetyNotes !== null &&
    !isStringArray(raw.safetyNotes)
  ) {
    errors.push(`${label}.safetyNotes must be an array of strings or null.`);
  }

  if (raw.description !== undefined && raw.description !== null) {
    if (typeof raw.description !== "string") {
      errors.push(`${label}.description must be a string or null.`);
    }
  }

  if (raw.equipment !== undefined && raw.equipment !== null) {
    if (typeof raw.equipment !== "string") {
      errors.push(`${label}.equipment must be a string or null.`);
    }
  }

  if (raw.isActive !== undefined && typeof raw.isActive !== "boolean") {
    errors.push(`${label}.isActive must be a boolean when provided.`);
  }

  const media = validateCatalogMedia(raw.media, errors, label);
  const mediaAssetsResult = validateCatalogMediaAssets(raw.mediaAssets);
  if (!mediaAssetsResult.ok) {
    errors.push(`${label}.${mediaAssetsResult.error}`);
  }
  const provider = normalizeProvider(raw.provider, options.manifestProvider, errors);

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  const catalogId = (raw.catalogId as string).trim();
  const name = (raw.name as string).trim();
  const nameLower = normalizeCatalogName(name);
  const searchPrefixes = buildCatalogSearchPrefixes(name);

  if (searchPrefixes.length === 0) {
    warnings.push(
      `${label} produced no searchPrefixes (name words may be shorter than 3 characters).`,
    );
  }

  const exercise: ValidatedCatalogExercise = {
    catalogId,
    name,
    nameLower,
    muscleGroup: raw.muscleGroup as MuscleGroup,
    description:
      raw.description === undefined ? null : (raw.description as string | null),
    instructions: raw.instructions as string[],
    tips: raw.tips === undefined ? null : (raw.tips as string[] | null),
    equipment:
      raw.equipment === undefined ? null : (raw.equipment as string | null),
    bodyPart: raw.bodyPart === undefined ? null : (raw.bodyPart as string | null),
    difficulty: (raw.difficulty ?? null) as ExerciseDifficulty | null,
    movementPattern:
      raw.movementPattern === undefined
        ? null
        : (raw.movementPattern as string | null),
    primaryMuscles: (raw.primaryMuscles as string[] | undefined) ?? [],
    secondaryMuscles:
      raw.secondaryMuscles === undefined
        ? null
        : (raw.secondaryMuscles as string[] | null),
    safetyNotes:
      raw.safetyNotes === undefined ? null : (raw.safetyNotes as string[] | null),
    category: raw.category === undefined ? null : (raw.category as string | null),
    isBodyweight: (raw.isBodyweight as boolean | undefined) ?? false,
    media,
    mediaAssets: mediaAssetsResult.ok ? mediaAssetsResult.assets : null,
    provider,
    catalogVersion: options.catalogVersion,
    searchPrefixes,
    isActive: (raw.isActive as boolean | undefined) ?? true,
  };

  return { ok: true, exercise, warnings };
}
