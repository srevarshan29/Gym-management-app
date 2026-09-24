import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import {
  buildCatalogSearchPrefixes,
  catalogNamePrefixEnd,
  normalizeCatalogSearchQuery,
  primaryCatalogSearchToken,
  tokenizeCatalogSearchQuery,
} from "@/lib/exercises/catalog-search";
import { validateExerciseCatalogDoc } from "@/lib/exercises/catalog-validation";
import { hasDemonstrationMedia } from "@/lib/exercises/media";
import { resolveExerciseSource } from "@/lib/exercises/source";
import type { StaffContext } from "@/lib/firestore/context";
import { platformContext } from "@/lib/firestore/helpers";
import { ExerciseCatalogRepository } from "@/lib/firestore/repositories/exercise-catalog";
import type { CustomExerciseDoc } from "@/lib/firestore/types";

function ts(): Timestamp {
  return Timestamp.fromDate(new Date("2026-09-20T00:00:00Z"));
}

function validCatalogInput(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    catalogId: "bench-press",
    name: "Bench Press",
    nameLower: "bench press",
    muscleGroup: "CHEST",
    description: "Compound chest press.",
    instructions: ["Lie on the bench.", "Press the bar up."],
    tips: null,
    equipment: "barbell",
    bodyPart: "chest",
    difficulty: "intermediate",
    movementPattern: "push",
    primaryMuscles: ["pectorals"],
    secondaryMuscles: ["triceps"],
    safetyNotes: null,
    category: "strength",
    isBodyweight: false,
    media: {
      primaryImageUrl: null,
      secondaryImageUrl: null,
      thumbnailUrl: null,
    },
    provider: {
      provider: "repdb",
      providerExerciseId: "bench-press",
      attributionText: null,
      attributionUrl: null,
      licenseTier: "free",
    },
    catalogVersion: "test-v1",
    searchPrefixes: buildCatalogSearchPrefixes("Bench Press"),
    isActive: true,
    createdAt: ts(),
    updatedAt: ts(),
    ...overrides,
  };
}

describe("catalog search normalization", () => {
  it("normalizes case, whitespace, and punctuation", () => {
    expect(normalizeCatalogSearchQuery("  Bench!!! Press  ")).toBe("bench press");
    expect(tokenizeCatalogSearchQuery("Bench Press")).toEqual(["bench", "press"]);
    expect(primaryCatalogSearchToken("  BENCH press ")).toBe("bench");
  });

  it("builds searchable prefixes for multi-word names", () => {
    expect(buildCatalogSearchPrefixes("Bench Press")).toEqual(
      expect.arrayContaining(["bench", "benc", "press", "pres"]),
    );
  });

  it("computes lexicographic prefix end bounds", () => {
    expect(catalogNamePrefixEnd("bench")).toBe("benci");
  });
});

describe("validateExerciseCatalogDoc", () => {
  it("accepts a complete catalog document", () => {
    const result = validateExerciseCatalogDoc(validCatalogInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.catalogId).toBe("bench-press");
      expect(result.doc.nameLower).toBe("bench press");
      expect(result.doc.isActive).toBe(true);
    }
  });

  it("rejects missing required fields", () => {
    const result = validateExerciseCatalogDoc({
      catalogId: "incomplete",
      name: "Incomplete",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "muscleGroup must be a valid muscle group.",
          "catalogVersion is required.",
          "isActive must be a boolean.",
          "createdAt must be a Timestamp.",
          "updatedAt must be a Timestamp.",
          "instructions must be an array of strings.",
          "media must be an object.",
          "provider must be an object.",
        ]),
      );
    }
  });

  it("rejects mismatched nameLower values", () => {
    const result = validateExerciseCatalogDoc(
      validCatalogInput({ nameLower: "wrong-name" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("nameLower must match normalized name.");
    }
  });
});

describe("ExerciseCatalogRepository access control", () => {
  it("denies member context reads", async () => {
    const repo = new ExerciseCatalogRepository({} as never);
    await expect(
      repo.getByCatalogId(
        { kind: "member", memberId: "m1", gymId: "gym-a" },
        "bench-press",
      ),
    ).rejects.toThrow("Unauthorized catalog read.");
  });

  it("allows staff context reads", async () => {
    const get = vi.fn().mockResolvedValue({
      exists: true,
      id: "bench-press",
      data: () => validCatalogInput(),
    });
    const doc = vi.fn(() => ({ get }));
    const collection = vi.fn(() => ({ doc }));
    const db = { collection } as never;

    const staffCtx: StaffContext = {
      kind: "staff",
      userId: "staff-1",
      gymId: "gym-a",
      role: "STAFF",
    };

    const repo = new ExerciseCatalogRepository(db);
    const result = await repo.getByCatalogId(staffCtx, "bench-press");
    expect(result?.id).toBe("bench-press");
    expect(result?.name).toBe("Bench Press");
  });
});

describe("ExerciseCatalogRepository listPage cursor pagination", () => {
  it("returns nextCursor when more results exist", async () => {
    const docs = ["alpha", "beta", "gamma"].map((id) => ({
      id,
      data: () => validCatalogInput({ catalogId: id, name: id, nameLower: id }),
    }));

    const get = vi.fn().mockResolvedValue({ exists: false });
    const limit = vi.fn().mockReturnValue({
      startAfter: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs }),
      }),
      get: vi.fn().mockResolvedValue({ docs }),
    });
    const orderByDocId = vi.fn().mockReturnValue({ limit });
    const orderBy = vi.fn().mockReturnValue({ orderBy: orderByDocId });
    const whereMuscle = vi.fn().mockReturnValue({ orderBy });
    const whereActive = vi.fn().mockReturnValue({ where: whereMuscle, orderBy });
    const collection = vi.fn(() => ({
      where: whereActive,
      doc: vi.fn(() => ({ get })),
    }));
    const db = { collection } as never;

    const staffCtx: StaffContext = {
      kind: "staff",
      userId: "staff-1",
      gymId: "gym-a",
      role: "OWNER",
    };

    const repo = new ExerciseCatalogRepository(db);
    const page = await repo.listPage(staffCtx, { limit: 2 });

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe("beta");
    expect(page.hasMore).toBe(true);
  });
});

describe("legacy gym exercise compatibility", () => {
  it("keeps Phase 1 custom exercise helpers working unchanged", () => {
    const legacyDoc: Pick<CustomExerciseDoc, "isSeeded"> = { isSeeded: true };
    expect(resolveExerciseSource(legacyDoc)).toBe("SEEDED");
    expect(
      hasDemonstrationMedia({
        primaryImageUrl: null,
        secondaryImageUrl: null,
        thumbnailUrl: null,
      }),
    ).toBe(false);
  });

  it("allows platform context for future sync scripts", async () => {
    const get = vi.fn().mockResolvedValue({ exists: false });
    const doc = vi.fn(() => ({ get }));
    const collection = vi.fn(() => ({ doc }));
    const db = { collection } as never;

    const repo = new ExerciseCatalogRepository(db);
    await expect(
      repo.getByCatalogId(platformContext, "missing-id"),
    ).resolves.toBeNull();
  });
});
