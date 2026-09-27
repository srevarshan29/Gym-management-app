import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DocWithId } from "@/lib/firestore/repositories/base";
import type { CustomExerciseDoc, ExerciseCatalogDoc } from "@/lib/firestore/types";
import { resolveGymExerciseMediaForRead } from "@/lib/exercises/gym-exercise-media-read";
import { hasDemonstrationMedia as hasDemoFlag } from "@/lib/exercises/media";
import { resolveDemonstrationImageUrl } from "@/lib/exercises/media-validation";

const PUBLIC_BASE =
  "https://example.supabase.co/storage/v1/object/public/gym-assets";

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_STORAGE_BUCKET = "gym-assets";
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_STORAGE_BUCKET;
});

function catalogUrl(catalogId: string, pose: "primary" | "secondary" | "thumbnail") {
  return `${PUBLIC_BASE}/catalog/${catalogId}/${pose}.webp`;
}

function gymUrl(
  gymId: string,
  exerciseId: string,
  pose: "primary" | "secondary" | "thumbnail",
) {
  return `${PUBLIC_BASE}/gyms/${gymId}/exercises/${exerciseId}/${pose}.webp`;
}

function seededBarbellRowDoc(
  overrides: Partial<CustomExerciseDoc> & { id?: string } = {},
): DocWithId<CustomExerciseDoc> {
  return {
    id: overrides.id ?? "seed-barbell-row",
    gymId: "gym-a",
    name: "Barbell Row",
    nameLower: "barbell row",
    muscleGroup: "BACK",
    defaultSets: 4,
    defaultReps: "8-10",
    defaultTempo: null,
    defaultRestSeconds: 90,
    trackingType: "WEIGHTED",
    isSeeded: true,
    exerciseSource: "SEEDED",
    catalogId: null,
    media: null,
    createdAt: {} as CustomExerciseDoc["createdAt"],
    updatedAt: {} as CustomExerciseDoc["updatedAt"],
    ...overrides,
  };
}

function catalogBarbellRowDoc(
  overrides: Partial<ExerciseCatalogDoc> = {},
): DocWithId<ExerciseCatalogDoc> {
  return {
    id: "barbell-row",
    catalogId: "barbell-row",
    name: "Barbell Row",
    nameLower: "barbell row",
    muscleGroup: "BACK",
    description: "Catalog fixture",
    instructions: ["Pull"],
    tips: [],
    equipment: "barbell",
    bodyPart: null,
    difficulty: "intermediate",
    movementPattern: null,
    primaryMuscles: ["lats"],
    secondaryMuscles: [],
    safetyNotes: [],
    category: null,
    isBodyweight: false,
    media: {
      primaryImageUrl: catalogUrl("barbell-row", "primary"),
      secondaryImageUrl: catalogUrl("barbell-row", "secondary"),
      thumbnailUrl: catalogUrl("barbell-row", "thumbnail"),
      animationUrl: null,
      videoUrl: null,
    },
    provider: {
      provider: "repdb",
      providerExerciseId: "barbell-row",
      attributionText: null,
      attributionUrl: null,
      licenseTier: null,
    },
    catalogVersion: "prod-v1",
    searchPrefixes: ["bar"],
    isActive: true,
    createdAt: {} as ExerciseCatalogDoc["createdAt"],
    updatedAt: {} as ExerciseCatalogDoc["updatedAt"],
    ...overrides,
  };
}

describe("resolveGymExerciseMediaForRead", () => {
  it("hydrates starter Barbell Row from platform catalog by exact name match", () => {
    const gymDoc = seededBarbellRowDoc();
    const catalog = catalogBarbellRowDoc();
    const media = resolveGymExerciseMediaForRead(
      gymDoc,
      new Map(),
      new Map([[catalog.nameLower, catalog]]),
    );

    expect(hasDemoFlag(media)).toBe(true);
    expect(resolveDemonstrationImageUrl(media)).toContain("/catalog/barbell-row/primary.webp");
  });

  it("uses catalogId fallback when gym copy has empty media", () => {
    const gymDoc = seededBarbellRowDoc({
      isSeeded: false,
      exerciseSource: "CATALOG",
      catalogId: "barbell-row",
      media: {
        primaryImageUrl: null,
        secondaryImageUrl: null,
        thumbnailUrl: null,
        animationUrl: null,
        videoUrl: null,
      },
    });
    const catalog = catalogBarbellRowDoc();
    const media = resolveGymExerciseMediaForRead(
      gymDoc,
      new Map([[catalog.catalogId, catalog]]),
      new Map(),
    );

    expect(resolveDemonstrationImageUrl(media)).toContain("primary.webp");
  });

  it("prefers valid gym-owned media over catalog fallback", () => {
    const gymDoc = seededBarbellRowDoc({
      media: {
        primaryImageUrl: gymUrl("gym-a", "seed-barbell-row", "primary"),
        secondaryImageUrl: null,
        thumbnailUrl: null,
        animationUrl: null,
        videoUrl: null,
      },
    });
    const catalog = catalogBarbellRowDoc();
    const media = resolveGymExerciseMediaForRead(
      gymDoc,
      new Map([[catalog.catalogId, catalog]]),
      new Map([[catalog.nameLower, catalog]]),
    );

    expect(resolveDemonstrationImageUrl(media)).toContain("/gyms/gym-a/exercises/seed-barbell-row/");
  });

  it("supports thumbnail-only catalog media", () => {
    const gymDoc = seededBarbellRowDoc();
    const catalog = catalogBarbellRowDoc({
      media: {
        primaryImageUrl: null,
        secondaryImageUrl: null,
        thumbnailUrl: catalogUrl("barbell-row", "thumbnail"),
        animationUrl: null,
        videoUrl: null,
      },
    });
    const media = resolveGymExerciseMediaForRead(
      gymDoc,
      new Map(),
      new Map([[catalog.nameLower, catalog]]),
    );

    expect(resolveDemonstrationImageUrl(media)).toContain("thumbnail.webp");
  });

  it("returns empty media when no catalog match exists", () => {
    const gymDoc = seededBarbellRowDoc();
    const media = resolveGymExerciseMediaForRead(gymDoc, new Map(), new Map());

    expect(hasDemoFlag(media)).toBe(false);
    expect(resolveDemonstrationImageUrl(media)).toBeNull();
  });

  it("rejects cross-tenant gym URLs on custom exercises", () => {
    const gymDoc = seededBarbellRowDoc({
      isSeeded: false,
      exerciseSource: "CUSTOM",
      media: {
        primaryImageUrl: gymUrl("gym-b", "other", "primary"),
        secondaryImageUrl: null,
        thumbnailUrl: null,
        animationUrl: null,
        videoUrl: null,
      },
    });
    const media = resolveGymExerciseMediaForRead(gymDoc, new Map(), new Map());

    expect(hasDemoFlag(media)).toBe(false);
  });
});
