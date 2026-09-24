import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  countCatalogMediaObjects,
  populateCatalogMediaFromAssets,
  validateCatalogMediaAssets,
} from "@/lib/catalog/catalog-media-population";
import { emptyExerciseMediaMetadata } from "@/lib/exercises/media-validation";
import type { ValidatedCatalogExercise } from "@/lib/catalog/types";

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

function validatedExercise(
  overrides: Partial<ValidatedCatalogExercise> = {},
): ValidatedCatalogExercise {
  return {
    catalogId: "dev-push-up",
    name: "Push Up",
    nameLower: "push up",
    muscleGroup: "CHEST",
    description: null,
    instructions: ["Step one."],
    tips: null,
    equipment: null,
    bodyPart: null,
    difficulty: null,
    movementPattern: null,
    primaryMuscles: ["pectorals"],
    secondaryMuscles: null,
    safetyNotes: null,
    category: null,
    isBodyweight: true,
    media: emptyExerciseMediaMetadata(),
    mediaAssets: { primary: "primary.webp" },
    provider: {
      provider: "gym",
      providerExerciseId: "dev-push-up",
      attributionText: null,
      attributionUrl: null,
      licenseTier: null,
    },
    catalogVersion: "dev-fixture-v1",
    searchPrefixes: ["pus", "push"],
    isActive: true,
    ...overrides,
  };
}

describe("validateCatalogMediaAssets", () => {
  it("accepts safe local filenames and rejects traversal", () => {
    expect(validateCatalogMediaAssets({ primary: "primary.webp" }).ok).toBe(true);
    expect(validateCatalogMediaAssets({ primary: "../evil.webp" }).ok).toBe(false);
    expect(validateCatalogMediaAssets({ primary: "primary.svg" }).ok).toBe(false);
  });
});

describe("populateCatalogMediaFromAssets", () => {
  it("populates scoped catalog URLs from local bundle assets", () => {
    const imagesRoot = mkdtempSync(join(tmpdir(), "catalog-images-"));
    const assetDir = join(imagesRoot, "dev-push-up");
    mkdirSync(assetDir, { recursive: true });
    writeFileSync(join(assetDir, "primary.webp"), "fake-webp");

    const populated = populateCatalogMediaFromAssets(validatedExercise(), {
      imagesRoot,
    });

    expect(populated.media.primaryImageUrl).toBe(
      `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`,
    );
    expect(countCatalogMediaObjects([populated])).toBe(1);
  });

  it("prefers uploaded URLs over planned asset URLs", () => {
    const imagesRoot = mkdtempSync(join(tmpdir(), "catalog-images-"));
    const uploadedUrl = `${PUBLIC_BASE}/catalog/dev-push-up/primary.jpg`;

    const populated = populateCatalogMediaFromAssets(validatedExercise(), {
      imagesRoot,
      uploadedUrls: { primary: uploadedUrl },
    });

    expect(populated.media.primaryImageUrl).toBe(uploadedUrl);
  });
});

describe("countCatalogMediaObjects", () => {
  it("counts only scoped catalog media URLs", () => {
    const count = countCatalogMediaObjects([
      validatedExercise({
        media: {
          primaryImageUrl: `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`,
          secondaryImageUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.webp`,
          thumbnailUrl: null,
        },
      }),
    ]);

    expect(count).toBe(1);
  });
});
