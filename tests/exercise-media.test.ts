import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  catalogMediaStoragePath,
  gymExerciseMediaStoragePath,
  isCatalogMetadataUrlAllowed,
  isCatalogScopedMediaUrl,
  isGymExerciseScopedMediaUrl,
  isUploadedGymExerciseMediaUrl,
  parseSupabasePublicStorageUrl,
} from "@/lib/exercises/media-paths";
import {
  assertCatalogExerciseMediaUrl,
  assertGymExerciseMediaUrl,
  normalizeExerciseMediaMetadata,
  resolveDemonstrationImageUrl,
  resolveListPreviewImageUrl,
  resolveSecondaryDemonstrationImageUrl,
  validateExerciseMediaMetadata,
  validateImageUploadFile,
} from "@/lib/exercises/media-validation";
import { hasDemonstrationMedia } from "@/lib/exercises/media";
import {
  buildGymExerciseMediaMetadataPatch,
} from "@/lib/exercises/media-storage";
import {
  canUploadExerciseMedia,
  canUploadExerciseMediaForExercise,
  isCustomExerciseMediaUploadTarget,
} from "@/lib/permissions";
import {
  extensionForMime,
  MAX_IMAGE_BYTES,
} from "@/lib/storage/image-validation";

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

describe("media storage paths", () => {
  it("builds separated catalog and gym exercise paths", () => {
    expect(catalogMediaStoragePath("dev-push-up", "primary")).toBe(
      "catalog/dev-push-up/primary",
    );
    expect(gymExerciseMediaStoragePath("gym-a", "ex-1", "secondary")).toBe(
      "gyms/gym-a/exercises/ex-1/secondary",
    );
  });

  it("rejects unsafe path segments", () => {
    expect(() => catalogMediaStoragePath("../evil", "primary")).toThrow();
    expect(() => gymExerciseMediaStoragePath("gym-a", "../../x", "primary")).toThrow();
  });

  it("scopes public URLs to catalog or gym prefixes", () => {
    const catalogUrl = `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`;
    const gymUrl = `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.webp`;
    const memberUrl = `${PUBLIC_BASE}/members/m1-123.jpg`;

    expect(isCatalogScopedMediaUrl(catalogUrl)).toBe(true);
    expect(isGymExerciseScopedMediaUrl(gymUrl, "gym-a")).toBe(true);
    expect(isGymExerciseScopedMediaUrl(gymUrl, "gym-b")).toBe(false);
    expect(isCatalogMetadataUrlAllowed(catalogUrl)).toBe(true);
    expect(isCatalogMetadataUrlAllowed(gymUrl)).toBe(false);
    expect(isCatalogMetadataUrlAllowed(memberUrl)).toBe(false);
    expect(isCatalogMetadataUrlAllowed(null)).toBe(true);
  });

  it("validates exact Supabase public storage URL structure", () => {
    const catalogUrl = `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`;
    const parsed = parseSupabasePublicStorageUrl(catalogUrl);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.objectPath).toBe("catalog/dev-push-up/primary.webp");
    }
  });

  it("rejects wrong host, bucket, and misleading substring URLs", () => {
    const catalogPath = "/storage/v1/object/public/gym-assets/catalog/dev-push-up/primary.webp";
    expect(
      isCatalogScopedMediaUrl(`https://evil.example${catalogPath}`),
    ).toBe(false);
    expect(
      isCatalogScopedMediaUrl(
        "https://example.supabase.co/storage/v1/object/public/other-bucket/catalog/dev-push-up/primary.webp",
      ),
    ).toBe(false);
    expect(
      isCatalogScopedMediaUrl(
        "https://attacker.example/storage/v1/object/public/gym-assets/catalog/dev-push-up/primary.webp",
      ),
    ).toBe(false);
  });

  it("rejects cross-gym exercise media URLs and gym URLs in catalog scope", () => {
    const gymAUrl = `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.webp`;
    const gymBUrl = `${PUBLIC_BASE}/gyms/gym-b/exercises/ex-1/primary.webp`;

    expect(isGymExerciseScopedMediaUrl(gymAUrl, "gym-a")).toBe(true);
    expect(isGymExerciseScopedMediaUrl(gymBUrl, "gym-a")).toBe(false);
    expect(isCatalogMetadataUrlAllowed(gymAUrl)).toBe(false);
  });

  it("rejects storage URLs when Supabase configuration is unavailable", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_STORAGE_BUCKET;

    const catalogUrl = `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`;
    expect(parseSupabasePublicStorageUrl(catalogUrl).ok).toBe(false);
    expect(isCatalogScopedMediaUrl(catalogUrl)).toBe(false);
    expect(isCatalogMetadataUrlAllowed(catalogUrl)).toBe(false);
  });

  it("accepts uploaded gym exercise URLs only for the expected object path", () => {
    const url = `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.webp`;
    expect(
      isUploadedGymExerciseMediaUrl(url, {
        gymId: "gym-a",
        exerciseId: "ex-1",
        pose: "primary",
      }),
    ).toBe(true);
    expect(
      isUploadedGymExerciseMediaUrl(url, {
        gymId: "gym-b",
        exerciseId: "ex-1",
        pose: "primary",
      }),
    ).toBe(false);
  });
});

describe("validateExerciseMediaMetadata", () => {
  it("accepts valid primary and secondary image metadata", () => {
    const result = validateExerciseMediaMetadata({
      primaryImageUrl: `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`,
      secondaryImageUrl: `${PUBLIC_BASE}/catalog/dev-push-up/secondary.webp`,
      thumbnailUrl: null,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.media.primaryImageUrl).toContain("/catalog/");
      expect(result.media.animationUrl).toBeNull();
      expect(result.media.videoUrl).toBeNull();
    }
  });

  it("rejects invalid URLs and reserved animation/video fields", () => {
    const invalidUrl = validateExerciseMediaMetadata({
      primaryImageUrl: "not-a-url",
      secondaryImageUrl: null,
      thumbnailUrl: null,
    });
    expect(invalidUrl.ok).toBe(false);

    const reserved = validateExerciseMediaMetadata({
      primaryImageUrl: null,
      secondaryImageUrl: null,
      thumbnailUrl: null,
      animationUrl: `${PUBLIC_BASE}/catalog/x/anim.webp`,
      videoUrl: null,
    });
    expect(reserved.ok).toBe(false);
  });

  it("rejects catalog metadata that points at gym-private storage", () => {
    const result = validateExerciseMediaMetadata(
      {
        primaryImageUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.webp`,
        secondaryImageUrl: null,
        thumbnailUrl: null,
      },
      { catalogScope: true },
    );

    expect(result.ok).toBe(false);
  });
});

describe("validateImageUploadFile", () => {
  it("accepts allowed image types within size limits", () => {
    expect(
      validateImageUploadFile({ type: "image/webp", size: 1024 }).ok,
    ).toBe(true);
    expect(extensionForMime("image/png")).toBe("image/png");
  });

  it("rejects unsupported file types", () => {
    expect(
      validateImageUploadFile({ type: "image/svg+xml", size: 100 }).ok,
    ).toBe(false);
    expect(
      validateImageUploadFile({ type: "application/pdf", size: 100 }).ok,
    ).toBe(false);
  });

  it("rejects oversized files", () => {
    expect(
      validateImageUploadFile({
        type: "image/jpeg",
        size: MAX_IMAGE_BYTES + 1,
      }).ok,
    ).toBe(false);
  });
});

describe("demonstration media resolution", () => {
  it("prefers primary, then secondary, and ignores reserved fields in v1", () => {
    const media = normalizeExerciseMediaMetadata({
      primaryImageUrl: `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`,
      secondaryImageUrl: `${PUBLIC_BASE}/catalog/dev-push-up/secondary.webp`,
      thumbnailUrl: `${PUBLIC_BASE}/catalog/dev-push-up/thumbnail.webp`,
      animationUrl: `${PUBLIC_BASE}/catalog/dev-push-up/anim.webp`,
      videoUrl: `${PUBLIC_BASE}/catalog/dev-push-up/video.mp4`,
    });

    expect(resolveDemonstrationImageUrl(media)).toContain("primary.webp");
    expect(resolveListPreviewImageUrl(media)).toContain("thumbnail.webp");
    expect(hasDemonstrationMedia(media)).toBe(true);
  });

  it("handles missing media safely", () => {
    expect(resolveDemonstrationImageUrl(null)).toBeNull();
    expect(hasDemonstrationMedia(null)).toBe(false);
    expect(hasDemonstrationMedia({ primaryImageUrl: null, secondaryImageUrl: null, thumbnailUrl: null })).toBe(false);
  });

  it("supports secondary-only demonstration metadata", () => {
    const media = {
      primaryImageUrl: null,
      secondaryImageUrl: `${PUBLIC_BASE}/catalog/dev-push-up/secondary.webp`,
      thumbnailUrl: null,
    };
    expect(resolveDemonstrationImageUrl(media)).toContain("secondary.webp");
    expect(hasDemonstrationMedia(media)).toBe(true);
  });

  it("exposes a distinct secondary URL for broken primary fallback", () => {
    const primary = `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`;
    const secondary = `${PUBLIC_BASE}/catalog/dev-push-up/secondary.webp`;
    const media = {
      primaryImageUrl: primary,
      secondaryImageUrl: secondary,
      thumbnailUrl: null,
    };

    expect(resolveDemonstrationImageUrl(media)).toBe(primary);
    expect(
      resolveSecondaryDemonstrationImageUrl(media, primary),
    ).toBe(secondary);
    expect(resolveSecondaryDemonstrationImageUrl(media, secondary)).toBeNull();
  });
});

describe("gym exercise media metadata patch", () => {
  it("updates only the requested pose field", () => {
    const patch = buildGymExerciseMediaMetadataPatch({
      pose: "primary",
      publicUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.webp`,
      existing: {
        primaryImageUrl: null,
        secondaryImageUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/secondary.webp`,
        thumbnailUrl: null,
      },
    });

    expect(patch.primaryImageUrl).toContain("/gyms/gym-a/exercises/");
    expect(patch.secondaryImageUrl).toContain("secondary.webp");
    expect(assertGymExerciseMediaUrl(patch.primaryImageUrl!, "gym-a")).toBe(true);
    expect(assertCatalogExerciseMediaUrl(`${PUBLIC_BASE}/catalog/x/primary.webp`)).toBe(true);
  });
});

describe("exercise media permissions", () => {
  it("allows owner and admin uploads only", () => {
    expect(canUploadExerciseMedia("OWNER")).toBe(true);
    expect(canUploadExerciseMedia("ADMIN")).toBe(true);
    expect(canUploadExerciseMedia("STAFF")).toBe(false);
    expect(canUploadExerciseMedia(null)).toBe(false);
  });

  it("limits uploads to custom non-seeded exercises", () => {
    expect(
      canUploadExerciseMediaForExercise("OWNER", {
        isSeeded: false,
        exerciseSource: "CUSTOM",
      }),
    ).toBe(true);
    expect(
      canUploadExerciseMediaForExercise("STAFF", {
        isSeeded: false,
        exerciseSource: "CUSTOM",
      }),
    ).toBe(false);
    expect(
      canUploadExerciseMediaForExercise("OWNER", {
        isSeeded: true,
        exerciseSource: "SEEDED",
      }),
    ).toBe(false);
    expect(
      canUploadExerciseMediaForExercise("OWNER", {
        isSeeded: false,
        exerciseSource: "CATALOG",
      }),
    ).toBe(false);
    expect(
      isCustomExerciseMediaUploadTarget({
        isSeeded: false,
        exerciseSource: "CUSTOM",
        catalogId: "dev-push-up",
      }),
    ).toBe(false);
  });
});

describe("legacy storage validation compatibility", () => {
  it("keeps the same allowed image mime set used by member photos and gym logos", () => {
    expect(validateImageUploadFile({ type: "image/jpeg", size: 1 }).ok).toBe(true);
    expect(validateImageUploadFile({ type: "image/gif", size: 1 }).ok).toBe(true);
    expect(validateImageUploadFile({ type: "image/svg+xml", size: 1 }).ok).toBe(false);
  });
});
