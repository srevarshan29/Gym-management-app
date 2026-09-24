import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CustomExerciseDoc } from "@/lib/firestore/types";
import {
  collectLibraryExerciseIdsFromPlan,
} from "@/lib/workout-tracking/session-plan";
import {
  getExerciseLibraryMapByIds,
  getExercisesByIds,
  searchExerciseLibrary,
} from "@/lib/workout-tracking/exercise-library";

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    customExercises: mockCustomExercises,
  }),
  platformContext: { kind: "platform" },
}));

vi.mock("@/lib/exercises", () => ({
  seedExercisesForGym: vi.fn(),
}));

const mockCustomExercises = {
  searchLibrary: vi.fn(),
  getByIds: vi.fn(),
};

const PUBLIC_BASE =
  "https://example.supabase.co/storage/v1/object/public/gym-assets";

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_STORAGE_BUCKET = "gym-assets";
  mockCustomExercises.searchLibrary.mockReset();
  mockCustomExercises.getByIds.mockReset();
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_STORAGE_BUCKET;
});

function exerciseDoc(
  overrides: Partial<CustomExerciseDoc> & { id: string },
): CustomExerciseDoc & { id: string } {
  return {
    gymId: "gym-a",
    name: "Push Up",
    nameLower: "push up",
    muscleGroup: "CHEST",
    defaultSets: 3,
    defaultReps: "12",
    defaultTempo: null,
    defaultRestSeconds: 60,
    trackingType: "BODYWEIGHT",
    isSeeded: true,
    createdAt: {} as never,
    updatedAt: {} as never,
    ...overrides,
  };
}

describe("collectLibraryExerciseIdsFromPlan", () => {
  it("returns unique library exercise ids from embedded plan rows", () => {
    const ids = collectLibraryExerciseIdsFromPlan({
      days: [
        {
          id: "day-1",
          label: "Day 1",
          sortOrder: 0,
          exercises: [
            {
              id: "row-1",
              exerciseId: "ex-1",
              customName: null,
              sortOrder: 0,
              targetSets: 3,
              targetReps: "10",
              tempo: null,
              restSeconds: 60,
              targetWeightKg: null,
              trackingTypeOverride: null,
            },
            {
              id: "row-2",
              exerciseId: "ex-1",
              customName: null,
              sortOrder: 1,
              targetSets: 3,
              targetReps: "10",
              tempo: null,
              restSeconds: 60,
              targetWeightKg: null,
              trackingTypeOverride: null,
            },
            {
              id: "row-3",
              exerciseId: null,
              customName: "Farmer walk",
              sortOrder: 2,
              targetSets: 3,
              targetReps: "10",
              tempo: null,
              restSeconds: 60,
              targetWeightKg: null,
              trackingTypeOverride: null,
            },
          ],
        },
      ],
    });

    expect(ids).toEqual(["ex-1"]);
  });
});

describe("searchExerciseLibrary", () => {
  it("returns bounded search results with cursor pagination metadata", async () => {
    mockCustomExercises.searchLibrary.mockResolvedValueOnce({
      items: [
        { ...exerciseDoc({ id: "ex-1", name: "Push Up" }) },
        { ...exerciseDoc({ id: "ex-2", name: "Pull Up", nameLower: "pull up", muscleGroup: "BACK" }) },
      ],
      nextCursor: "ex-2",
    });

    const page = await searchExerciseLibrary("gym-a", {
      query: "push",
      muscleGroup: "CHEST",
    });

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe("ex-2");
    expect(page.items[0]?.media).toEqual({
      primaryImageUrl: null,
      secondaryImageUrl: null,
      thumbnailUrl: null,
      animationUrl: null,
      videoUrl: null,
    });
    expect(page.items[0]?.hasMedia).toBe(false);
    expect(mockCustomExercises.searchLibrary).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
      expect.objectContaining({
        query: "push",
        muscleGroup: "CHEST",
      }),
    );
  });
});

describe("getExercisesByIds", () => {
  it("loads only requested exercise ids for the gym", async () => {
    mockCustomExercises.getByIds.mockResolvedValueOnce([
      exerciseDoc({
        id: "ex-1",
        exerciseSource: "CATALOG",
        isSeeded: false,
        catalogId: "dev-push-up",
        media: {
          primaryImageUrl: `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`,
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
      }),
      exerciseDoc({ id: "ex-2", name: "Custom Move", isSeeded: false, exerciseSource: "CUSTOM" }),
    ]);

    const items = await getExercisesByIds("gym-a", ["ex-1", "ex-2"]);

    expect(items).toHaveLength(2);
    expect(items[0]?.exerciseSource).toBe("CATALOG");
    expect(items[0]?.hasMedia).toBe(true);
    expect(items[0]?.media?.primaryImageUrl).toContain("/catalog/");
    expect(items[1]?.exerciseSource).toBe("CUSTOM");
    expect(mockCustomExercises.getByIds).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
      ["ex-1", "ex-2"],
    );
  });
});

describe("getExerciseLibraryMapByIds", () => {
  it("returns an empty map when no ids are requested", async () => {
    const map = await getExerciseLibraryMapByIds("gym-a", []);
    expect(map.size).toBe(0);
    expect(mockCustomExercises.getByIds).not.toHaveBeenCalled();
  });
});
