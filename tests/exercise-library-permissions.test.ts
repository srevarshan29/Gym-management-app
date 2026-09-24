import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireGym,
  getById,
  deleteCustomExercise,
  updateExerciseDefaults,
  isExerciseReferenced,
  findByNameLower,
  createExercise,
} = vi.hoisted(() => ({
  requireGym: vi.fn(),
  getById: vi.fn(),
  deleteCustomExercise: vi.fn(),
  updateExerciseDefaults: vi.fn(),
  isExerciseReferenced: vi.fn(),
  findByNameLower: vi.fn(),
  createExercise: vi.fn(),
}));

import {
  deleteExercise,
  updateExerciseDefaults as updateExerciseDefaultsAction,
} from "@/app/actions/exercises";
import { refreshExerciseFromCatalog } from "@/app/actions/catalog";
import type { CustomExerciseDoc } from "@/lib/firestore/types";
import {
  canDeleteLibraryExercise,
  canEditExerciseDefaults,
  canImportExerciseCatalog,
  isCatalogLinkedExercise,
} from "@/lib/permissions";

vi.mock("@/lib/session", () => ({
  requireGym,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    customExercises: {
      getById,
      deleteCustomExercise,
      updateExerciseDefaults,
      findByNameLower,
      createExercise,
    },
    workoutPlans: {
      isExerciseReferenced,
    },
  }),
  platformContext: { kind: "platform" },
  newDocId: () => "new-exercise-id",
}));

function exerciseDoc(
  overrides: Partial<CustomExerciseDoc> = {},
): CustomExerciseDoc {
  return {
    gymId: "gym-a",
    name: "Move",
    nameLower: "move",
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
    media: null,
    createdAt: {} as never,
    updatedAt: {} as never,
    ...overrides,
  };
}

describe("isCatalogLinkedExercise", () => {
  it("detects explicit catalog imports and legacy catalogId links", () => {
    expect(
      isCatalogLinkedExercise({
        isSeeded: false,
        exerciseSource: "CATALOG",
        catalogId: "bench-press",
      }),
    ).toBe(true);
    expect(
      isCatalogLinkedExercise({
        isSeeded: false,
        exerciseSource: "CUSTOM",
        catalogId: "bench-press",
      }),
    ).toBe(true);
  });

  it("does not treat custom or seeded exercises as catalog-linked", () => {
    expect(
      isCatalogLinkedExercise({
        isSeeded: false,
        exerciseSource: "CUSTOM",
        catalogId: null,
      }),
    ).toBe(false);
    expect(
      isCatalogLinkedExercise({
        isSeeded: true,
        exerciseSource: "SEEDED",
        catalogId: null,
      }),
    ).toBe(false);
  });
});

describe("catalog exercise library permissions", () => {
  const catalogExercise = {
    isSeeded: false,
    exerciseSource: "CATALOG" as const,
    catalogId: "bench-press",
  };
  const customExercise = {
    isSeeded: false,
    exerciseSource: "CUSTOM" as const,
    catalogId: null,
  };
  const seededExercise = {
    isSeeded: true,
    exerciseSource: "SEEDED" as const,
    catalogId: null,
  };

  it("allows Owner and Admin to edit and delete catalog imports", () => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      expect(canEditExerciseDefaults(role, catalogExercise)).toBe(true);
      expect(canDeleteLibraryExercise(role, catalogExercise)).toBe(true);
      expect(canImportExerciseCatalog(role)).toBe(true);
    }
  });

  it("allows Staff to edit and delete custom exercises only", () => {
    expect(canEditExerciseDefaults("STAFF", customExercise)).toBe(true);
    expect(canDeleteLibraryExercise("STAFF", customExercise)).toBe(true);
    expect(canEditExerciseDefaults("STAFF", catalogExercise)).toBe(false);
    expect(canDeleteLibraryExercise("STAFF", catalogExercise)).toBe(false);
    expect(canImportExerciseCatalog("STAFF")).toBe(false);
  });

  it("blocks all roles from editing or deleting seeded exercises", () => {
    for (const role of ["OWNER", "ADMIN", "STAFF"] as const) {
      expect(canEditExerciseDefaults(role, seededExercise)).toBe(false);
      expect(canDeleteLibraryExercise(role, seededExercise)).toBe(false);
    }
  });
});

describe("deleteExercise action", () => {
  beforeEach(() => {
    requireGym.mockReset();
    getById.mockReset();
    deleteCustomExercise.mockReset();
    isExerciseReferenced.mockReset();

    requireGym.mockResolvedValue({ gymId: "gym-a", role: "STAFF" });
    isExerciseReferenced.mockResolvedValue(false);
    deleteCustomExercise.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("denies Staff from deleting catalog-imported exercises", async () => {
    getById.mockResolvedValue(
      exerciseDoc({ exerciseSource: "CATALOG", catalogId: "bench" }),
    );

    const result = await deleteExercise("ex-catalog");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/owner or admin/i);
    }
    expect(deleteCustomExercise).not.toHaveBeenCalled();
  });

  it("allows Staff to delete custom exercises in their gym", async () => {
    getById.mockResolvedValue(exerciseDoc({ exerciseSource: "CUSTOM" }));

    const result = await deleteExercise("ex-custom");

    expect(result.ok).toBe(true);
    expect(deleteCustomExercise).toHaveBeenCalledWith(
      expect.anything(),
      "gym-a",
      "ex-custom",
    );
  });

  it("allows Owner to delete catalog-imported exercises", async () => {
    requireGym.mockResolvedValue({ gymId: "gym-a", role: "OWNER" });
    getById.mockResolvedValue(
      exerciseDoc({ exerciseSource: "CATALOG", catalogId: "bench" }),
    );

    const result = await deleteExercise("ex-catalog");

    expect(result.ok).toBe(true);
    expect(deleteCustomExercise).toHaveBeenCalled();
  });

  it("blocks seeded exercise deletion for Owner", async () => {
    requireGym.mockResolvedValue({ gymId: "gym-a", role: "OWNER" });
    getById.mockResolvedValue(
      exerciseDoc({ isSeeded: true, exerciseSource: "SEEDED" }),
    );

    const result = await deleteExercise("seed-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/starter exercises/i);
    }
    expect(deleteCustomExercise).not.toHaveBeenCalled();
  });

  it("does not delete exercises from another gym", async () => {
    getById.mockResolvedValue(null);

    const result = await deleteExercise("ex-other-gym");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not found/i);
    }
    expect(deleteCustomExercise).not.toHaveBeenCalled();
  });
});

describe("updateExerciseDefaults action", () => {
  beforeEach(() => {
    requireGym.mockReset();
    getById.mockReset();
    updateExerciseDefaults.mockReset();

    requireGym.mockResolvedValue({ gymId: "gym-a", role: "STAFF" });
    updateExerciseDefaults.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("denies Staff from editing catalog-imported exercises", async () => {
    getById.mockResolvedValue(
      exerciseDoc({ exerciseSource: "CATALOG", catalogId: "bench" }),
    );

    const result = await updateExerciseDefaultsAction({
      id: "ex-catalog",
      defaultSets: 4,
      defaultReps: "8",
      defaultTempo: "",
      defaultRestSeconds: 90,
      trackingType: "WEIGHTED",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/owner or admin/i);
    }
    expect(updateExerciseDefaults).not.toHaveBeenCalled();
  });

  it("allows Staff to edit custom exercise defaults", async () => {
    getById.mockResolvedValue(exerciseDoc({ exerciseSource: "CUSTOM" }));

    const result = await updateExerciseDefaultsAction({
      id: "ex-custom",
      defaultSets: 4,
      defaultReps: "8",
      defaultTempo: "",
      defaultRestSeconds: 90,
      trackingType: "WEIGHTED",
    });

    expect(result.ok).toBe(true);
    expect(updateExerciseDefaults).toHaveBeenCalledWith(
      expect.anything(),
      "gym-a",
      "ex-custom",
      expect.objectContaining({ defaultSets: 4 }),
    );
  });

  it("allows Admin to edit catalog-imported defaults", async () => {
    requireGym.mockResolvedValue({ gymId: "gym-a", role: "ADMIN" });
    getById.mockResolvedValue(
      exerciseDoc({ exerciseSource: "CATALOG", catalogId: "bench" }),
    );

    const result = await updateExerciseDefaultsAction({
      id: "ex-catalog",
      defaultSets: 5,
      defaultReps: "5",
      defaultTempo: "",
      defaultRestSeconds: 120,
      trackingType: "WEIGHTED",
    });

    expect(result.ok).toBe(true);
    expect(updateExerciseDefaults).toHaveBeenCalled();
  });

  it("blocks seeded exercise edits for Admin", async () => {
    requireGym.mockResolvedValue({ gymId: "gym-a", role: "ADMIN" });
    getById.mockResolvedValue(
      exerciseDoc({ isSeeded: true, exerciseSource: "SEEDED" }),
    );

    const result = await updateExerciseDefaultsAction({
      id: "seed-1",
      defaultSets: 4,
      defaultReps: "8",
      defaultTempo: "",
      defaultRestSeconds: 90,
      trackingType: "WEIGHTED",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/starter exercises/i);
    }
    expect(updateExerciseDefaults).not.toHaveBeenCalled();
  });

  it("does not update exercises missing from the caller gym", async () => {
    getById.mockResolvedValue(null);

    const result = await updateExerciseDefaultsAction({
      id: "ex-other-gym",
      defaultSets: 4,
      defaultReps: "8",
      defaultTempo: "",
      defaultRestSeconds: 90,
      trackingType: "WEIGHTED",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not found/i);
    }
    expect(updateExerciseDefaults).not.toHaveBeenCalled();
  });
});

describe("refreshExerciseFromCatalog action", () => {
  beforeEach(() => {
    requireGym.mockReset();
    requireGym.mockResolvedValue({ gymId: "gym-a", role: "STAFF" });
  });

  it("denies Staff from refreshing catalog metadata", async () => {
    const result = await refreshExerciseFromCatalog("ex-catalog");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/import/i);
    }
  });
});
