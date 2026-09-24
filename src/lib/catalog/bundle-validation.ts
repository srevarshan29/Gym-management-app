import { readFileSync } from "node:fs";

import { sha256Hex } from "@/lib/catalog/hash";
import { validateCatalogExerciseInput } from "@/lib/catalog/input-validation";
import {
  validateCatalogManifest,
  validateManifestExerciseCount,
  validateManifestSha256,
} from "@/lib/catalog/manifest-validation";
import {
  CATALOG_EXERCISES_PATH,
  CATALOG_MANIFEST_PATH,
} from "@/lib/catalog/paths";
import type {
  CatalogBundleValidationResult,
  CatalogSyncFailureRecord,
  ValidatedCatalogExercise,
} from "@/lib/catalog/types";

export type LoadedCatalogBundle = {
  manifestRaw: unknown;
  exercisesRaw: unknown;
  exercisesJson: string;
  manifestPath: string;
  exercisesPath: string;
};

export function loadCatalogBundleFiles(options?: {
  manifestPath?: string;
  exercisesPath?: string;
}): LoadedCatalogBundle {
  const manifestPath = options?.manifestPath ?? CATALOG_MANIFEST_PATH;
  const exercisesPath = options?.exercisesPath ?? CATALOG_EXERCISES_PATH;
  const manifestRaw = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
  const exercisesJson = readFileSync(exercisesPath, "utf8");
  const exercisesRaw = JSON.parse(exercisesJson) as unknown;
  return {
    manifestRaw,
    exercisesRaw,
    exercisesJson,
    manifestPath,
    exercisesPath,
  };
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function validateCatalogBundle(
  bundle: LoadedCatalogBundle,
): CatalogBundleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const failures: CatalogSyncFailureRecord[] = [];

  const manifestResult = validateCatalogManifest(bundle.manifestRaw);
  if (!manifestResult.ok) {
    return {
      ok: false,
      errors: manifestResult.errors,
      warnings,
      failures: manifestResult.errors.map((message) => ({
        catalogId: null,
        phase: "manifest",
        message,
      })),
    };
  }

  if (!Array.isArray(bundle.exercisesRaw)) {
    return {
      ok: false,
      errors: ["exercises.json must contain a JSON array."],
      warnings,
      failures: [
        {
          catalogId: null,
          phase: "validation",
          message: "exercises.json must contain a JSON array.",
        },
      ],
    };
  }

  const countError = validateManifestExerciseCount(
    manifestResult.manifest,
    bundle.exercisesRaw.length,
  );
  if (countError) {
    errors.push(countError);
    failures.push({ catalogId: null, phase: "manifest", message: countError });
  }

  const computedSha = sha256Hex(bundle.exercisesJson);
  const shaError = validateManifestSha256(manifestResult.manifest, computedSha);
  if (shaError) {
    errors.push(shaError);
    failures.push({ catalogId: null, phase: "manifest", message: shaError });
  }

  const validated: ValidatedCatalogExercise[] = [];
  let invalidCount = 0;

  bundle.exercisesRaw.forEach((row, index) => {
    const result = validateCatalogExerciseInput(row, {
      catalogVersion: manifestResult.manifest.catalogVersion,
      manifestProvider: manifestResult.manifest.provider,
      index,
    });
    if (!result.ok) {
      invalidCount += 1;
      errors.push(...result.errors);
      for (const message of result.errors) {
        failures.push({
          catalogId:
            row && typeof row === "object" && typeof (row as { catalogId?: unknown }).catalogId === "string"
              ? (row as { catalogId: string }).catalogId
              : null,
          phase: "validation",
          message,
        });
      }
      return;
    }
    warnings.push(...result.warnings);
    validated.push(result.exercise);
  });

  const duplicateCatalogIds = findDuplicates(validated.map((row) => row.catalogId));
  for (const catalogId of duplicateCatalogIds) {
    const message = `Duplicate catalogId "${catalogId}" in exercises.json.`;
    errors.push(message);
    failures.push({ catalogId, phase: "validation", message });
  }

  const duplicateNameLowers = findDuplicates(validated.map((row) => row.nameLower));
  for (const nameLower of duplicateNameLowers) {
    const message = `Duplicate normalized name "${nameLower}" in exercises.json.`;
    errors.push(message);
    failures.push({ catalogId: null, phase: "validation", message });
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
      failures,
    };
  }

  if (invalidCount > 0) {
    return {
      ok: false,
      errors: [`${invalidCount} invalid exercise row(s) in exercises.json.`],
      warnings,
      failures,
    };
  }

  return {
    ok: true,
    manifest: manifestResult.manifest,
    exercises: validated,
    warnings,
  };
}
