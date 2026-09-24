import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toCatalogBrowseItem } from "@/lib/catalog/catalog-browse-types";
import {
  isScopedCatalogExerciseMediaUrl,
  isStructuredExerciseMediaUrl,
  isUploadedGymExerciseMediaUrl,
} from "@/lib/exercises/media-paths";
import { hasDemonstrationMedia } from "@/lib/exercises/media";
import {
  resolveDemonstrationImageUrl,
  resolveListPreviewImageUrl,
  sanitizeCatalogExerciseMediaForRead,
  sanitizeGymExerciseMediaForRead,
} from "@/lib/exercises/media-validation";
import type { CustomExerciseDoc, ExerciseCatalogDoc } from "@/lib/firestore/types";
import type { DocWithId } from "@/lib/firestore/repositories/base";

const PUBLIC_BASE =
  "https://example.supabase.co/storage/v1/object/public/gym-assets";

const GYM_A = "gym-a";
const GYM_B = "gym-b";
const EXERCISE_A = "ex-a";
const EXERCISE_B = "ex-b";
const CATALOG_ID = "dev-push-up";

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_STORAGE_BUCKET = "gym-assets";
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_STORAGE_BUCKET;
});

function gymUrl(
  gymId: string,
  exerciseId: string,
  pose: "primary" | "secondary" | "thumbnail",
  ext = "webp",
) {
  return `${PUBLIC_BASE}/gyms/${gymId}/exercises/${exerciseId}/${pose}.${ext}`;
}

function catalogUrl(
  catalogId: string,
  pose: "primary" | "secondary" | "thumbnail",
  ext = "webp",
) {
  return `${PUBLIC_BASE}/catalog/${catalogId}/${pose}.${ext}`;
}

describe("isScopedCatalogExerciseMediaUrl", () => {
  it("accepts exact catalog pose URLs and rejects gym or wrong catalog IDs", () => {
    const valid = catalogUrl(CATALOG_ID, "primary");
    expect(isScopedCatalogExerciseMediaUrl(valid, CATALOG_ID, "primary")).toBe(true);
    expect(isScopedCatalogExerciseMediaUrl(valid, "other-catalog", "primary")).toBe(false);
    expect(
      isScopedCatalogExerciseMediaUrl(gymUrl(GYM_A, EXERCISE_A, "primary"), CATALOG_ID, "primary"),
    ).toBe(false);
  });

  it("rejects unsupported extensions and malformed URLs", () => {
    expect(
      isScopedCatalogExerciseMediaUrl(
        `${PUBLIC_BASE}/catalog/${CATALOG_ID}/primary.svg`,
        CATALOG_ID,
        "primary",
      ),
    ).toBe(false);
    expect(
      isScopedCatalogExerciseMediaUrl("https://evil.example/photo.jpg", CATALOG_ID, "primary"),
    ).toBe(false);
    expect(
      isScopedCatalogExerciseMediaUrl("//example.supabase.co/x", CATALOG_ID, "primary"),
    ).toBe(false);
  });
});

describe("sanitizeGymExerciseMediaForRead", () => {
  it("accepts valid gym-owned media for the current gym and exercise", () => {
    const sanitized = sanitizeGymExerciseMediaForRead(
      {
        primaryImageUrl: gymUrl(GYM_A, EXERCISE_A, "primary"),
        secondaryImageUrl: gymUrl(GYM_A, EXERCISE_A, "secondary"),
        thumbnailUrl: gymUrl(GYM_A, EXERCISE_A, "thumbnail"),
      },
      { gymId: GYM_A, exerciseId: EXERCISE_A },
    );

    expect(sanitized.primaryImageUrl).toContain(`/gyms/${GYM_A}/exercises/${EXERCISE_A}/`);
    expect(hasDemonstrationMedia(sanitized)).toBe(true);
    expect(resolveDemonstrationImageUrl(sanitized)).toBeTruthy();
  });

  it("rejects cross-gym, cross-exercise, catalog, external, and malformed URLs", () => {
    const sanitized = sanitizeGymExerciseMediaForRead(
      {
        primaryImageUrl: gymUrl(GYM_B, EXERCISE_A, "primary"),
        secondaryImageUrl: gymUrl(GYM_A, EXERCISE_B, "secondary"),
        thumbnailUrl: catalogUrl(CATALOG_ID, "thumbnail"),
      },
      { gymId: GYM_A, exerciseId: EXERCISE_A },
    );

    expect(sanitized.primaryImageUrl).toBeNull();
    expect(sanitized.secondaryImageUrl).toBeNull();
    expect(sanitized.thumbnailUrl).toBeNull();
    expect(hasDemonstrationMedia(sanitized)).toBe(false);
    expect(resolveDemonstrationImageUrl(sanitized)).toBeNull();
  });

  it("accepts catalog media for catalog-linked gym exercises and rejects gym URLs", () => {
    const sanitized = sanitizeGymExerciseMediaForRead(
      {
        primaryImageUrl: catalogUrl(CATALOG_ID, "primary"),
        secondaryImageUrl: gymUrl(GYM_A, EXERCISE_A, "secondary"),
        thumbnailUrl: catalogUrl(CATALOG_ID, "thumbnail"),
      },
      { gymId: GYM_A, exerciseId: EXERCISE_A, catalogId: CATALOG_ID },
    );

    expect(sanitized.primaryImageUrl).toContain(`/catalog/${CATALOG_ID}/`);
    expect(sanitized.secondaryImageUrl).toBeNull();
    expect(sanitized.thumbnailUrl).toContain("thumbnail.webp");
  });

  it("preserves missing and legacy empty media without throwing", () => {
    expect(
      sanitizeGymExerciseMediaForRead(null, { gymId: GYM_A, exerciseId: EXERCISE_A }),
    ).toEqual({
      primaryImageUrl: null,
      secondaryImageUrl: null,
      thumbnailUrl: null,
      animationUrl: null,
      videoUrl: null,
    });

    expect(
      sanitizeGymExerciseMediaForRead(
        { primaryImageUrl: "   ", secondaryImageUrl: null, thumbnailUrl: null },
        { gymId: GYM_A, exerciseId: EXERCISE_A },
      ).primaryImageUrl,
    ).toBeNull();
  });

  it("rejects external attacker-controlled URLs", () => {
    const sanitized = sanitizeGymExerciseMediaForRead(
      {
        primaryImageUrl: "https://attacker.example/evil.jpg",
        secondaryImageUrl: null,
        thumbnailUrl: null,
      },
      { gymId: GYM_A, exerciseId: EXERCISE_A },
    );

    expect(sanitized.primaryImageUrl).toBeNull();
    expect(resolveListPreviewImageUrl(sanitized)).toBeNull();
  });
});

describe("sanitizeCatalogExerciseMediaForRead", () => {
  it("accepts valid catalog media for the matching catalog ID", () => {
    const sanitized = sanitizeCatalogExerciseMediaForRead(
      {
        primaryImageUrl: catalogUrl(CATALOG_ID, "primary"),
        secondaryImageUrl: catalogUrl(CATALOG_ID, "secondary"),
        thumbnailUrl: catalogUrl(CATALOG_ID, "thumbnail"),
      },
      CATALOG_ID,
    );

    expect(sanitized.primaryImageUrl).toContain(`/catalog/${CATALOG_ID}/`);
    expect(hasDemonstrationMedia(sanitized)).toBe(true);
  });

  it("rejects gym URLs, wrong catalog IDs, and external URLs in catalog context", () => {
    const sanitized = sanitizeCatalogExerciseMediaForRead(
      {
        primaryImageUrl: gymUrl(GYM_A, EXERCISE_A, "primary"),
        secondaryImageUrl: catalogUrl("other-catalog", "secondary"),
        thumbnailUrl: "https://evil.example/x.jpg",
      },
      CATALOG_ID,
    );

    expect(sanitized.primaryImageUrl).toBeNull();
    expect(sanitized.secondaryImageUrl).toBeNull();
    expect(sanitized.thumbnailUrl).toBeNull();
  });
});

describe("read boundaries", () => {
  it("sanitizes gym library loader output and blocks cross-tenant media", async () => {
    vi.resetModules();
    const mockCustomExercises = {
      getByIds: vi.fn().mockResolvedValue([
        {
          id: EXERCISE_A,
          gymId: GYM_A,
          name: "Custom Press",
          nameLower: "custom press",
          muscleGroup: "CHEST",
          defaultSets: 3,
          defaultReps: "10",
          defaultTempo: null,
          defaultRestSeconds: 60,
          trackingType: "WEIGHTED",
          isSeeded: false,
          exerciseSource: "CUSTOM",
          catalogId: null,
          importedCatalogVersion: null,
          createdAt: {} as never,
          updatedAt: {} as never,
          media: {
            primaryImageUrl: gymUrl(GYM_B, EXERCISE_A, "primary"),
            secondaryImageUrl: gymUrl(GYM_A, EXERCISE_A, "secondary"),
            thumbnailUrl: null,
          },
        } satisfies CustomExerciseDoc & { id: string },
      ]),
    };

    vi.doMock("@/lib/firestore", () => ({
      getRepositories: () => ({ customExercises: mockCustomExercises }),
      platformContext: { kind: "platform" },
    }));

    const { getExercisesByIds: loadExercises } = await import(
      "@/lib/workout-tracking/exercise-library"
    );

    const items = await loadExercises(GYM_A, [EXERCISE_A]);
    expect(items).toHaveLength(1);
    expect(items[0]!.media?.primaryImageUrl).toBeNull();
    expect(items[0]!.media?.secondaryImageUrl).toContain(`/gyms/${GYM_A}/`);
    expect(items[0]!.hasMedia).toBe(true);
  });

  it("sanitizes catalog browse items at the mapper boundary", () => {
    const doc = {
      id: "doc-1",
      catalogId: CATALOG_ID,
      name: "Push Up",
      nameLower: "push up",
      muscleGroup: "CHEST",
      description: null,
      equipment: null,
      difficulty: null,
      primaryMuscles: [],
      isBodyweight: true,
      catalogVersion: "1",
      media: {
        primaryImageUrl: catalogUrl(CATALOG_ID, "primary"),
        secondaryImageUrl: gymUrl(GYM_A, EXERCISE_A, "secondary"),
        thumbnailUrl: catalogUrl("wrong-id", "thumbnail"),
      },
    } as unknown as DocWithId<ExerciseCatalogDoc>;

    const item = toCatalogBrowseItem(doc, new Set());
    expect(item.media?.primaryImageUrl).toContain(`/catalog/${CATALOG_ID}/`);
    expect(item.media?.secondaryImageUrl).toBeNull();
    expect(item.media?.thumbnailUrl).toBeNull();
    expect(item.hasMedia).toBe(true);
  });
});

describe("isStructuredExerciseMediaUrl", () => {
  it("accepts configured storage URLs with known media shapes", () => {
    expect(isStructuredExerciseMediaUrl(catalogUrl(CATALOG_ID, "primary"))).toBe(true);
    expect(isStructuredExerciseMediaUrl(gymUrl(GYM_A, EXERCISE_A, "secondary"))).toBe(true);
  });

  it("rejects external, member, and unsupported extension URLs", () => {
    expect(isStructuredExerciseMediaUrl("https://evil.example/x.jpg")).toBe(false);
    expect(
      isStructuredExerciseMediaUrl(`${PUBLIC_BASE}/members/m1/photo.webp`),
    ).toBe(false);
    expect(
      isStructuredExerciseMediaUrl(`${PUBLIC_BASE}/catalog/${CATALOG_ID}/primary.svg`),
    ).toBe(false);
  });
});

describe("isUploadedGymExerciseMediaUrl", () => {
  it("requires exact gym, exercise, pose, and extension", () => {
    const url = gymUrl(GYM_A, EXERCISE_A, "primary");
    expect(
      isUploadedGymExerciseMediaUrl(url, {
        gymId: GYM_A,
        exerciseId: EXERCISE_A,
        pose: "primary",
      }),
    ).toBe(true);
    expect(
      isUploadedGymExerciseMediaUrl(url, {
        gymId: GYM_A,
        exerciseId: EXERCISE_A,
        pose: "secondary",
      }),
    ).toBe(false);
  });
});
