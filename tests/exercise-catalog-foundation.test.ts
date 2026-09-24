import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CustomExerciseDoc } from "@/lib/firestore/types";
import { hasDemonstrationMedia } from "@/lib/exercises/media";
import { resolveExerciseSource } from "@/lib/exercises/source";
import {
  canBrowseExerciseCatalog,
  canImportExerciseCatalog,
  canManageExerciseLibrary,
} from "@/lib/permissions";

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

/** Legacy seeded exercise shape (no optional catalog fields). */
function legacySeededExercise(): Pick<
  CustomExerciseDoc,
  "isSeeded" | "name" | "gymId" | "trackingType"
> {
  return {
    gymId: "gym-1",
    name: "Bench Press",
    isSeeded: true,
    trackingType: "WEIGHTED",
  };
}

/** Legacy custom exercise shape (no optional catalog fields). */
function legacyCustomExercise(): Pick<
  CustomExerciseDoc,
  "isSeeded" | "name" | "gymId" | "trackingType"
> {
  return {
    gymId: "gym-1",
    name: "My Custom Move",
    isSeeded: false,
    trackingType: "WEIGHTED",
  };
}

/** Full legacy document as stored in Firestore today. */
function legacyFirestoreDoc(): CustomExerciseDoc {
  const now = {} as CustomExerciseDoc["createdAt"];
  return {
    gymId: "gym-1",
    name: "Squat",
    nameLower: "squat",
    muscleGroup: "LEGS",
    defaultSets: 4,
    defaultReps: "6-8",
    defaultTempo: null,
    defaultRestSeconds: 120,
    trackingType: "WEIGHTED",
    isSeeded: true,
    createdAt: now,
    updatedAt: now,
  };
}

describe("resolveExerciseSource", () => {
  it("maps legacy seeded exercises to SEEDED", () => {
    const doc = legacySeededExercise();
    expect(resolveExerciseSource(doc)).toBe("SEEDED");
  });

  it("maps legacy custom exercises to CUSTOM", () => {
    const doc = legacyCustomExercise();
    expect(resolveExerciseSource(doc)).toBe("CUSTOM");
  });

  it("prefers explicit exerciseSource when valid", () => {
    expect(
      resolveExerciseSource({
        isSeeded: true,
        exerciseSource: "CATALOG",
      }),
    ).toBe("CATALOG");
    expect(
      resolveExerciseSource({
        isSeeded: false,
        exerciseSource: "SEEDED",
      }),
    ).toBe("SEEDED");
    expect(
      resolveExerciseSource({
        isSeeded: false,
        exerciseSource: "CUSTOM",
      }),
    ).toBe("CUSTOM");
  });

  it("falls back to legacy inference when exerciseSource is missing or invalid", () => {
    expect(
      resolveExerciseSource({
        isSeeded: true,
        exerciseSource: null,
      }),
    ).toBe("SEEDED");
    expect(
      resolveExerciseSource({
        isSeeded: false,
        exerciseSource: undefined,
      }),
    ).toBe("CUSTOM");
    expect(
      resolveExerciseSource({
        isSeeded: false,
        exerciseSource: "INVALID" as "CUSTOM",
      }),
    ).toBe("CUSTOM");
  });

  it("handles documents with missing optional catalog fields", () => {
    const doc = legacyFirestoreDoc();
    expect(resolveExerciseSource(doc)).toBe("SEEDED");
    expect(doc.exerciseSource).toBeUndefined();
    expect(doc.media).toBeUndefined();
    expect(doc.catalogId).toBeUndefined();
  });
});

describe("hasDemonstrationMedia", () => {
  it("returns true for a valid primary image URL", () => {
    expect(
      hasDemonstrationMedia({
        primaryImageUrl: `${PUBLIC_BASE}/catalog/bench/primary.webp`,
        secondaryImageUrl: null,
        thumbnailUrl: null,
      }),
    ).toBe(true);
  });

  it("returns true for a valid secondary image URL only", () => {
    expect(
      hasDemonstrationMedia({
        primaryImageUrl: null,
        secondaryImageUrl: `${PUBLIC_BASE}/catalog/bench/secondary.webp`,
        thumbnailUrl: null,
      }),
    ).toBe(true);
  });

  it("returns false for null, undefined, and empty URLs", () => {
    expect(hasDemonstrationMedia(undefined)).toBe(false);
    expect(hasDemonstrationMedia(null)).toBe(false);
    expect(
      hasDemonstrationMedia({
        primaryImageUrl: null,
        secondaryImageUrl: null,
        thumbnailUrl: null,
      }),
    ).toBe(false);
    expect(
      hasDemonstrationMedia({
        primaryImageUrl: "",
        secondaryImageUrl: "   ",
        thumbnailUrl: null,
      }),
    ).toBe(false);
  });

  it("returns false for non-http(s) or malformed URLs", () => {
    expect(
      hasDemonstrationMedia({
        primaryImageUrl: "ftp://example.com/image.webp",
        secondaryImageUrl: null,
        thumbnailUrl: null,
      }),
    ).toBe(false);
    expect(
      hasDemonstrationMedia({
        primaryImageUrl: "not-a-url",
        secondaryImageUrl: null,
        thumbnailUrl: null,
      }),
    ).toBe(false);
  });

  it("does not treat thumbnail, animation, or video URLs as demonstration media in v1", () => {
    expect(
      hasDemonstrationMedia({
        primaryImageUrl: null,
        secondaryImageUrl: null,
        thumbnailUrl: "https://cdn.example.com/thumb.webp",
        animationUrl: "https://cdn.example.com/anim.webp",
        videoUrl: "https://cdn.example.com/video.mp4",
      }),
    ).toBe(false);
  });
});

describe("legacy CustomExerciseDoc compatibility", () => {
  it("accepts existing required-field-only documents without catalog metadata", () => {
    const doc: CustomExerciseDoc = legacyFirestoreDoc();
    expect(doc.name).toBe("Squat");
    expect(doc.isSeeded).toBe(true);
    expect(doc.trackingType).toBe("WEIGHTED");
  });
});

describe("exercise catalog permissions", () => {
  it("allows OWNER, ADMIN, and STAFF to browse the catalog and add custom exercises", () => {
    for (const role of ["OWNER", "ADMIN", "STAFF"] as const) {
      expect(canBrowseExerciseCatalog(role)).toBe(true);
      expect(canManageExerciseLibrary(role)).toBe(true);
    }
  });

  it("restricts catalog import, refresh, and catalog exercise edit/delete to OWNER and ADMIN", () => {
    expect(canImportExerciseCatalog("OWNER")).toBe(true);
    expect(canImportExerciseCatalog("ADMIN")).toBe(true);
    expect(canImportExerciseCatalog("STAFF")).toBe(false);
    expect(canImportExerciseCatalog(null)).toBe(false);
  });
});
