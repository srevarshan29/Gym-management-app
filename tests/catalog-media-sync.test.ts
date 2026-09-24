import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { syncCatalogMediaAssets } from "@/lib/catalog/catalog-media-sync";
import { emptyExerciseMediaMetadata } from "@/lib/exercises/media-validation";
import type { ValidatedCatalogExercise } from "@/lib/catalog/types";

const uploadMock = vi.fn();
const removeMock = vi.fn();
const getPublicUrlMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        remove: removeMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
  })),
}));

import { resetSupabaseAdminCache } from "@/lib/storage";

const PUBLIC_BASE =
  "https://example.supabase.co/storage/v1/object/public/gym-assets";

beforeEach(() => {
  vi.clearAllMocks();
  resetSupabaseAdminCache();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.SUPABASE_STORAGE_BUCKET = "gym-assets";
  getPublicUrlMock.mockReturnValue({
    data: {
      publicUrl: `${PUBLIC_BASE}/catalog/dev-push-up/primary.jpg`,
    },
  });
  uploadMock.mockResolvedValue({ error: null });
  removeMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_STORAGE_BUCKET;
  resetSupabaseAdminCache();
});

function exerciseWithAsset(imagesRoot: string): ValidatedCatalogExercise {
  const assetDir = join(imagesRoot, "dev-push-up");
  mkdirSync(assetDir, { recursive: true });
  writeFileSync(join(assetDir, "primary.webp"), "fake-webp");

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
  };
}

describe("syncCatalogMediaAssets", () => {
  it("plans metadata population in dry-run without uploading", async () => {
    const imagesRoot = mkdtempSync(join(tmpdir(), "catalog-sync-images-"));
    const exercise = exerciseWithAsset(imagesRoot);

    const result = await syncCatalogMediaAssets({
      exercises: [exercise],
      imagesRoot,
      uploadMedia: false,
      dryRun: true,
    });

    expect(result.uploaded).toBe(0);
    expect(result.mediaObjectCount).toBe(1);
    expect(result.exercises[0]?.media.primaryImageUrl).toContain(
      "/catalog/dev-push-up/primary.webp",
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("uploads local assets and embeds scoped URLs when uploadMedia is enabled", async () => {
    const imagesRoot = mkdtempSync(join(tmpdir(), "catalog-sync-images-"));
    const exercise = exerciseWithAsset(imagesRoot);

    const result = await syncCatalogMediaAssets({
      exercises: [exercise],
      imagesRoot,
      uploadMedia: true,
      dryRun: false,
    });

    expect(result.uploaded).toBe(1);
    expect(result.mediaObjectCount).toBe(1);
    expect(result.exercises[0]?.media.primaryImageUrl).toContain(
      "/catalog/dev-push-up/primary.jpg",
    );
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });

  it("records missing local assets without throwing", async () => {
    const imagesRoot = mkdtempSync(join(tmpdir(), "catalog-sync-images-"));
    const result = await syncCatalogMediaAssets({
      exercises: [
        {
          ...exerciseWithAsset(imagesRoot),
          mediaAssets: { primary: "missing.webp" },
        },
      ],
      imagesRoot,
      uploadMedia: false,
      dryRun: true,
    });

    expect(result.mediaObjectCount).toBe(0);
    expect(result.failures.some((failure) => failure.phase === "media")).toBe(true);
  });
});
