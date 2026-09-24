import type { Timestamp } from "firebase-admin/firestore";

import {
  buildCatalogSearchPrefixes,
  normalizeCatalogName,
} from "@/lib/exercises/catalog-search";
import type {
  ExerciseDifficulty,
  ExerciseMediaMetadata,
  ExerciseProviderMetadata,
} from "@/lib/exercises/catalog-types";
import type { ExerciseCatalogDoc } from "@/lib/firestore/types";
import { MUSCLE_GROUP_VALUES, type MuscleGroup } from "@/lib/muscle-groups";

const DIFFICULTY_VALUES = [
  "beginner",
  "intermediate",
  "advanced",
] as const satisfies readonly ExerciseDifficulty[];

const PROVIDER_VALUES = ["repdb", "custom", "gym"] as const;

export type CatalogValidationResult =
  | { ok: true; doc: ExerciseCatalogDoc }
  | { ok: false; errors: string[] };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTimestampLike(value: unknown): value is Timestamp {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as { seconds?: unknown; toDate?: unknown };
  return (
    typeof candidate.seconds === "number" ||
    typeof candidate.toDate === "function"
  );
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
    (typeof value === "string" &&
      (DIFFICULTY_VALUES as readonly string[]).includes(value))
  );
}

function validateMedia(value: unknown, errors: string[]): ExerciseMediaMetadata | null {
  if (value == null || typeof value !== "object") {
    errors.push("media must be an object.");
    return null;
  }
  const media = value as Record<string, unknown>;
  const nullableString = (field: string): string | null => {
    const raw = media[field];
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== "string") {
      errors.push(`media.${field} must be a string or null.`);
      return null;
    }
    return raw;
  };

  return {
    primaryImageUrl: nullableString("primaryImageUrl"),
    secondaryImageUrl: nullableString("secondaryImageUrl"),
    thumbnailUrl: nullableString("thumbnailUrl"),
    animationUrl: nullableString("animationUrl"),
    videoUrl: nullableString("videoUrl"),
  };
}

function validateProvider(
  value: unknown,
  errors: string[],
): ExerciseProviderMetadata | null {
  if (value == null || typeof value !== "object") {
    errors.push("provider must be an object.");
    return null;
  }
  const provider = value as Record<string, unknown>;
  if (
    typeof provider.provider !== "string" ||
    !(PROVIDER_VALUES as readonly string[]).includes(provider.provider)
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
    provider: provider.provider as ExerciseProviderMetadata["provider"],
    providerExerciseId: nullableString("providerExerciseId"),
    attributionText: nullableString("attributionText"),
    attributionUrl: nullableString("attributionUrl"),
    licenseTier: nullableString("licenseTier"),
  };
}

/**
 * Validates a platform catalog document shape before persistence or sync.
 * Does not mutate input; returns normalized doc on success.
 */
export function validateExerciseCatalogDoc(
  input: unknown,
): CatalogValidationResult {
  const errors: string[] = [];

  if (input == null || typeof input !== "object") {
    return { ok: false, errors: ["Catalog document must be an object."] };
  }

  const raw = input as Record<string, unknown>;

  if (!isNonEmptyString(raw.catalogId)) {
    errors.push("catalogId is required.");
  }
  if (!isNonEmptyString(raw.name)) {
    errors.push("name is required.");
  }
  if (!isMuscleGroup(raw.muscleGroup)) {
    errors.push("muscleGroup must be a valid muscle group.");
  }
  if (!isNonEmptyString(raw.catalogVersion)) {
    errors.push("catalogVersion is required.");
  }
  if (typeof raw.isActive !== "boolean") {
    errors.push("isActive must be a boolean.");
  }
  if (!isTimestampLike(raw.createdAt)) {
    errors.push("createdAt must be a Timestamp.");
  }
  if (!isTimestampLike(raw.updatedAt)) {
    errors.push("updatedAt must be a Timestamp.");
  }
  if (!isStringArray(raw.instructions)) {
    errors.push("instructions must be an array of strings.");
  }
  if (raw.primaryMuscles !== undefined && !isStringArray(raw.primaryMuscles)) {
    errors.push("primaryMuscles must be an array of strings.");
  }
  if (
    raw.secondaryMuscles !== undefined &&
    raw.secondaryMuscles !== null &&
    !isStringArray(raw.secondaryMuscles)
  ) {
    errors.push("secondaryMuscles must be an array of strings or null.");
  }
  if (
    raw.tips !== undefined &&
    raw.tips !== null &&
    !isStringArray(raw.tips)
  ) {
    errors.push("tips must be an array of strings or null.");
  }
  if (
    raw.safetyNotes !== undefined &&
    raw.safetyNotes !== null &&
    !isStringArray(raw.safetyNotes)
  ) {
    errors.push("safetyNotes must be an array of strings or null.");
  }
  if (!isDifficulty(raw.difficulty)) {
    errors.push("difficulty must be beginner, intermediate, advanced, or null.");
  }
  if (raw.description !== undefined && raw.description !== null) {
    if (typeof raw.description !== "string") {
      errors.push("description must be a string or null.");
    }
  }
  if (raw.equipment !== undefined && raw.equipment !== null) {
    if (typeof raw.equipment !== "string") {
      errors.push("equipment must be a string or null.");
    }
  }
  if (raw.bodyPart !== undefined && raw.bodyPart !== null) {
    if (typeof raw.bodyPart !== "string") {
      errors.push("bodyPart must be a string or null.");
    }
  }
  if (raw.movementPattern !== undefined && raw.movementPattern !== null) {
    if (typeof raw.movementPattern !== "string") {
      errors.push("movementPattern must be a string or null.");
    }
  }
  if (raw.category !== undefined && raw.category !== null) {
    if (typeof raw.category !== "string") {
      errors.push("category must be a string or null.");
    }
  }
  if (raw.isBodyweight !== undefined && typeof raw.isBodyweight !== "boolean") {
    errors.push("isBodyweight must be a boolean when provided.");
  }

  const media = validateMedia(raw.media, errors);
  const provider = validateProvider(raw.provider, errors);

  const name = isNonEmptyString(raw.name) ? raw.name.trim() : "";
  const nameLower =
    typeof raw.nameLower === "string" && raw.nameLower.trim()
      ? raw.nameLower.trim().toLowerCase()
      : normalizeCatalogName(name);

  if (name && nameLower !== normalizeCatalogName(name)) {
    errors.push("nameLower must match normalized name.");
  }

  let searchPrefixes: string[] = [];
  if (raw.searchPrefixes === undefined) {
    if (name) searchPrefixes = buildCatalogSearchPrefixes(name);
  } else if (!isStringArray(raw.searchPrefixes)) {
    errors.push("searchPrefixes must be an array of strings.");
  } else {
    searchPrefixes = raw.searchPrefixes;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const catalogId = (raw.catalogId as string).trim();

  return {
    ok: true,
    doc: {
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
      media: media!,
      provider: provider!,
      catalogVersion: (raw.catalogVersion as string).trim(),
      searchPrefixes,
      isActive: raw.isActive as boolean,
      createdAt: raw.createdAt as Timestamp,
      updatedAt: raw.updatedAt as Timestamp,
    },
  };
}
