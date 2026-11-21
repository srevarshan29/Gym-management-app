import { describe, expect, it } from "vitest";

import {
  compareMediaUrls,
  diffComparableCatalogContent,
  existingComparableContent,
  plannedComparableContent,
} from "@/lib/catalog/catalog-sync-preflight";
import { normalizeExerciseCatalogBrowseTags } from "@/lib/firestore/exercise-catalog-normalize";
import type { ExerciseCatalogDoc } from "@/lib/firestore/types";
import type { ValidatedCatalogExercise } from "@/lib/catalog/types";
import { emptyExerciseMediaMetadata } from "@/lib/exercises/media-validation";

function validatedFixture(
  overrides: Partial<ValidatedCatalogExercise> = {},
): ValidatedCatalogExercise {
  return {
    catalogId: "bench-press",
    name: "Bench Press",
    nameLower: "bench press",
    muscleGroup: "CHEST",
    description: null,
    instructions: ["Step one."],
    tips: null,
    equipment: "barbell",
    bodyPart: "chest",
    difficulty: "intermediate",
    movementPattern: "push",
    primaryMuscles: ["pectorals"],
    secondaryMuscles: null,
    safetyNotes: null,
    category: "strength",
    isBodyweight: false,
    media: emptyExerciseMediaMetadata(),
    provider: {
      provider: "repdb",
      providerExerciseId: "bench-press",
      attributionText: null,
      attributionUrl: null,
      licenseTier: "free",
    },
    catalogVersion: "repdb-free-v1",
    searchPrefixes: ["ben"],
    isActive: true,
    fullBody: false,
    cardio: false,
    ...overrides,
  };
}

function catalogDocFixture(
  overrides: Partial<ExerciseCatalogDoc> = {},
): ExerciseCatalogDoc {
  return {
    catalogId: "bench-press",
    name: "Bench Press",
    nameLower: "bench press",
    muscleGroup: "CHEST",
    description: null,
    instructions: ["Step one."],
    tips: null,
    equipment: "barbell",
    bodyPart: "chest",
    difficulty: "intermediate",
    movementPattern: "push",
    primaryMuscles: ["pectorals"],
    secondaryMuscles: null,
    safetyNotes: null,
    category: "strength",
    isBodyweight: false,
    media: emptyExerciseMediaMetadata(),
    provider: {
      provider: "repdb",
      providerExerciseId: "bench-press",
      attributionText: null,
      attributionUrl: null,
      licenseTier: "free",
    },
    catalogVersion: "repdb-free-v1",
    searchPrefixes: ["ben"],
    isActive: true,
    ...overrides,
  } as ExerciseCatalogDoc;
}

describe("catalog sync preflight comparison", () => {
  it("treats missing Firestore browse tags as false", () => {
    const doc = catalogDocFixture();
    const normalized = normalizeExerciseCatalogBrowseTags(doc);
    expect(normalized.fullBody).toBe(false);
    expect(normalized.cardio).toBe(false);
    const existing = existingComparableContent(doc);
    expect(existing.fullBody).toBe(false);
    expect(existing.cardio).toBe(false);
  });

  it("detects classification and muscle metadata changes", () => {
    const before = existingComparableContent(
      catalogDocFixture({
        muscleGroup: "BACK",
        primaryMuscles: ["lats"],
      }),
    );
    const after = plannedComparableContent(
      validatedFixture({
        muscleGroup: "LEGS",
        fullBody: true,
        cardio: true,
        primaryMuscles: ["quads"],
        secondaryMuscles: ["glutes"],
      }),
    );
    const { fieldChanges } = diffComparableCatalogContent(
      "bench-press",
      before,
      after,
    );
    const fields = new Set(fieldChanges.map((row) => row.field));
    expect(fields.has("muscleGroup")).toBe(true);
    expect(fields.has("fullBody")).toBe(true);
    expect(fields.has("cardio")).toBe(true);
    expect(fields.has("primaryMuscles")).toBe(true);
    expect(fields.has("secondaryMuscles")).toBe(true);
  });

  it("classifies media URL deltas", () => {
    const base = emptyExerciseMediaMetadata();
    const rows = compareMediaUrls("burpees", base, {
      ...base,
      primaryImageUrl: "https://cdn.example/catalog/burpees/primary.webp",
      thumbnailUrl: "https://cdn.example/catalog/burpees/thumb.webp",
    });
    expect(rows.find((r) => r.pose === "primaryImageUrl")?.status).toBe("added");
    expect(rows.find((r) => r.pose === "secondaryImageUrl")?.status).toBe(
      "unchanged",
    );
    const changed = compareMediaUrls("burpees", {
      ...base,
      primaryImageUrl: "https://cdn.example/a.webp",
    }, {
      ...base,
      primaryImageUrl: "https://cdn.example/b.webp",
    });
    expect(changed.find((r) => r.pose === "primaryImageUrl")?.status).toBe(
      "changed",
    );
  });
});