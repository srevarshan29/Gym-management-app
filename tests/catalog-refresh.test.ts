import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

import {
  buildCatalogMetadataRefreshPatch,
  refreshExerciseFromCatalogForGym,
} from "@/lib/catalog/catalog-refresh";
import type { StaffContext } from "@/lib/firestore/context";
import type { CustomExerciseDoc, ExerciseCatalogDoc } from "@/lib/firestore/types";

function staffCtx(gymId: string): StaffContext {
  return { kind: "staff", userId: "user-1", gymId, role: "OWNER" };
}

function catalogDoc(): ExerciseCatalogDoc {
  const now = Timestamp.fromDate(new Date("2026-09-20T00:00:00Z"));
  return {
    catalogId: "dev-push-up",
    name: "Push Up",
    nameLower: "push up",
    muscleGroup: "CHEST",
    description: "Updated description.",
    instructions: ["Updated step."],
    tips: null,
    equipment: null,
    bodyPart: null,
    difficulty: "beginner",
    movementPattern: null,
    primaryMuscles: ["pectorals"],
    secondaryMuscles: null,
    safetyNotes: null,
    category: null,
    isBodyweight: true,
    media: {
      primaryImageUrl: "https://cdn.example.com/push-up.webp",
      secondaryImageUrl: null,
      thumbnailUrl: null,
    },
    provider: {
      provider: "gym",
      providerExerciseId: "dev-push-up",
      attributionText: null,
      attributionUrl: null,
      licenseTier: null,
    },
    catalogVersion: "dev-fixture-v2",
    searchPrefixes: ["pus", "push"],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function gymExercise(): CustomExerciseDoc {
  const now = Timestamp.fromDate(new Date("2026-09-20T00:00:00Z"));
  return {
    gymId: "gym-a",
    name: "Push Up",
    nameLower: "push up",
    muscleGroup: "CHEST",
    defaultSets: 3,
    defaultReps: "12",
    defaultTempo: "3010",
    defaultRestSeconds: 60,
    trackingType: "BODYWEIGHT",
    isSeeded: false,
    exerciseSource: "CATALOG",
    catalogId: "dev-push-up",
    importedCatalogVersion: "dev-fixture-v1",
    description: "Old description.",
    instructions: ["Old step."],
    createdAt: now,
    updatedAt: now,
  };
}

describe("buildCatalogMetadataRefreshPatch", () => {
  it("updates catalog metadata without overwriting gym defaults", () => {
    const existing = gymExercise();
    const patch = buildCatalogMetadataRefreshPatch(catalogDoc(), existing);

    expect(patch.description).toBe("Updated description.");
    expect(patch.importedCatalogVersion).toBe("dev-fixture-v2");
    expect(patch.defaultSets).toBe(3);
    expect(patch.defaultReps).toBe("12");
    expect(patch.name).toBe("Push Up");
  });
});

describe("refreshExerciseFromCatalogForGym", () => {
  it("refreshes catalog-linked exercises and preserves defaults", async () => {
    const exercise = { id: "ex-1", ...gymExercise() };
    const updates: Array<Partial<CustomExerciseDoc>> = [];

    const result = await refreshExerciseFromCatalogForGym({
      ctx: staffCtx("gym-a"),
      gymId: "gym-a",
      exerciseId: "ex-1",
      repos: {
        customExercises: {
          getById: async () => exercise,
          update: async (
            _ctx: unknown,
            _gymId: string,
            _id: string,
            patch: Partial<CustomExerciseDoc>,
          ) => {
            updates.push(patch);
            return { ...exercise, ...patch, id: "ex-1" };
          },
        },
        exerciseCatalog: {
          getByCatalogId: async () => ({ id: "dev-push-up", ...catalogDoc() }),
        },
      } as never,
    });

    expect(result.status).toBe("refreshed");
    expect(updates[0]?.defaultSets).toBe(3);
    expect(updates[0]?.description).toBe("Updated description.");
  });

  it("returns unchanged when catalog version already matches", async () => {
    const exercise = {
      id: "ex-1",
      ...gymExercise(),
      importedCatalogVersion: "dev-fixture-v2",
    };

    const result = await refreshExerciseFromCatalogForGym({
      ctx: staffCtx("gym-a"),
      gymId: "gym-a",
      exerciseId: "ex-1",
      repos: {
        customExercises: {
          getById: async () => exercise,
          update: async () => exercise,
        },
        exerciseCatalog: {
          getByCatalogId: async () => ({ id: "dev-push-up", ...catalogDoc() }),
        },
      } as never,
    });

    expect(result.status).toBe("unchanged");
  });

  it("refreshes legacy catalogId-only exercises when the catalog document is valid", async () => {
    const exercise = {
      id: "ex-legacy",
      ...gymExercise(),
      exerciseSource: undefined,
    };
    const updates: Array<Partial<CustomExerciseDoc>> = [];

    const result = await refreshExerciseFromCatalogForGym({
      ctx: staffCtx("gym-a"),
      gymId: "gym-a",
      exerciseId: "ex-legacy",
      repos: {
        customExercises: {
          getById: async () => exercise,
          update: async (
            _ctx: unknown,
            _gymId: string,
            _id: string,
            patch: Partial<CustomExerciseDoc>,
          ) => {
            updates.push(patch);
            return { ...exercise, ...patch, id: "ex-legacy" };
          },
        },
        exerciseCatalog: {
          getByCatalogId: async () => ({ id: "dev-push-up", ...catalogDoc() }),
        },
      } as never,
    });

    expect(result.status).toBe("refreshed");
    expect(updates[0]?.exerciseSource).toBe("CATALOG");
    expect(updates[0]?.defaultSets).toBe(3);
    expect(updates[0]?.description).toBe("Updated description.");
  });

  it("rejects refresh when the catalog document is missing", async () => {
    const exercise = { id: "ex-1", ...gymExercise() };

    const result = await refreshExerciseFromCatalogForGym({
      ctx: staffCtx("gym-a"),
      gymId: "gym-a",
      exerciseId: "ex-1",
      repos: {
        customExercises: {
          getById: async () => exercise,
          update: async () => exercise,
        },
        exerciseCatalog: {
          getByCatalogId: async () => null,
        },
      } as never,
    });

    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toMatch(/not found/i);
    }
  });

  it("rejects refresh when the catalog document is inactive", async () => {
    const exercise = { id: "ex-1", ...gymExercise() };

    const result = await refreshExerciseFromCatalogForGym({
      ctx: staffCtx("gym-a"),
      gymId: "gym-a",
      exerciseId: "ex-1",
      repos: {
        customExercises: {
          getById: async () => exercise,
          update: async () => exercise,
        },
        exerciseCatalog: {
          getByCatalogId: async () => ({
            id: "dev-push-up",
            ...catalogDoc(),
            isActive: false,
          }),
        },
      } as never,
    });

    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toMatch(/inactive/i);
    }
  });

  it("rejects cross-gym refresh access", async () => {
    const exercise = {
      id: "ex-1",
      ...gymExercise(),
      gymId: "gym-b",
    };

    const result = await refreshExerciseFromCatalogForGym({
      ctx: staffCtx("gym-a"),
      gymId: "gym-a",
      exerciseId: "ex-1",
      repos: {
        customExercises: {
          getById: async () => exercise,
          update: async () => exercise,
        },
        exerciseCatalog: {
          getByCatalogId: async () => ({ id: "dev-push-up", ...catalogDoc() }),
        },
      } as never,
    });

    expect(result.status).toBe("unavailable");
    if (result.status === "unavailable") {
      expect(result.reason).toMatch(/not found/i);
    }
  });

  it("preserves gym defaults and media metadata on refresh", async () => {
    const exercise = { id: "ex-1", ...gymExercise() };
    const updates: Array<Partial<CustomExerciseDoc>> = [];

    await refreshExerciseFromCatalogForGym({
      ctx: staffCtx("gym-a"),
      gymId: "gym-a",
      exerciseId: "ex-1",
      repos: {
        customExercises: {
          getById: async () => exercise,
          update: async (
            _ctx: unknown,
            _gymId: string,
            _id: string,
            patch: Partial<CustomExerciseDoc>,
          ) => {
            updates.push(patch);
            return { ...exercise, ...patch, id: "ex-1" };
          },
        },
        exerciseCatalog: {
          getByCatalogId: async () => ({ id: "dev-push-up", ...catalogDoc() }),
        },
      } as never,
    });

    expect(updates[0]?.media).toEqual(catalogDoc().media);
    expect(updates[0]?.defaultReps).toBe("12");
    expect(updates[0]?.name).toBe("Push Up");
  });
});
