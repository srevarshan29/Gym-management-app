import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCatalogExerciseMediaMetadataPatch,
  completeCatalogMediaUpload,
  uploadCatalogDemonstrationImage,
} from "@/lib/catalog/catalog-media-storage";
import { catalogMediaStoragePath } from "@/lib/exercises/media-paths";

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

function jpegFile(size = 1024) {
  return new File([new Uint8Array(size)], "demo.jpg", { type: "image/jpeg" });
}

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

describe("uploadCatalogDemonstrationImage", () => {
  it("uploads to the catalog media storage path", async () => {
    const result = await uploadCatalogDemonstrationImage({
      catalogId: "dev-push-up",
      pose: "primary",
      file: jpegFile(),
    });

    expect(result).toEqual({
      url: `${PUBLIC_BASE}/catalog/dev-push-up/primary.jpg`,
      objectPath: "catalog/dev-push-up/primary.jpg",
    });
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });
});

describe("completeCatalogMediaUpload", () => {
  it("returns scoped metadata for a valid catalog upload", async () => {
    const result = await completeCatalogMediaUpload({
      catalogId: "dev-push-up",
      pose: "primary",
      file: jpegFile(),
      existing: {
        primaryImageUrl: null,
        secondaryImageUrl: null,
        thumbnailUrl: null,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.media.primaryImageUrl).toContain("/catalog/dev-push-up/");
      expect(result.url).toContain("primary.jpg");
    }
  });

  it("cleans up uploads when returned URLs fail scope validation", async () => {
    getPublicUrlMock.mockReturnValueOnce({
      data: {
        publicUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.jpg`,
      },
    });

    const result = await completeCatalogMediaUpload({
      catalogId: "dev-push-up",
      pose: "primary",
      file: jpegFile(),
    });

    expect(result.ok).toBe(false);
    expect(removeMock).toHaveBeenCalledWith([
      catalogMediaStoragePath("dev-push-up", "primary") + ".jpg",
    ]);
  });
});

describe("buildCatalogExerciseMediaMetadataPatch", () => {
  it("updates only the requested catalog pose field", () => {
    const patch = buildCatalogExerciseMediaMetadataPatch({
      pose: "secondary",
      publicUrl: `${PUBLIC_BASE}/catalog/dev-push-up/secondary.webp`,
      existing: {
        primaryImageUrl: `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`,
        secondaryImageUrl: null,
        thumbnailUrl: null,
      },
    });

    expect(patch.primaryImageUrl).toContain("primary.webp");
    expect(patch.secondaryImageUrl).toContain("secondary.webp");
  });
});
