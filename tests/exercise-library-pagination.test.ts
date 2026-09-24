import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  InvalidPaginationCursorError,
  TenantIsolationError,
} from "@/lib/firestore/errors";
import { CustomExercisesRepository } from "@/lib/firestore/repositories/custom-exercises";
import type { CustomExerciseDoc } from "@/lib/firestore/types";
import {
  browseExerciseLibrary,
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
  countByGym: vi.fn(),
};

beforeEach(() => {
  mockCustomExercises.searchLibrary.mockReset();
  mockCustomExercises.countByGym.mockReset();
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

describe("browseExerciseLibrary", () => {
  it("returns the first page with total count", async () => {
    mockCustomExercises.searchLibrary.mockResolvedValueOnce({
      items: [
        exerciseDoc({ id: "ex-1", name: "Arnold Press", nameLower: "arnold press" }),
        exerciseDoc({ id: "ex-2", name: "Bench Press", nameLower: "bench press" }),
      ],
      nextCursor: "ex-2",
    });
    mockCustomExercises.countByGym.mockResolvedValueOnce(120);

    const page = await browseExerciseLibrary("gym-a");

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe("ex-2");
    expect(page.totalCount).toBe(120);
    expect(mockCustomExercises.searchLibrary).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
      expect.objectContaining({ limit: 50, startAfterId: null }),
    );
  });

  it("loads the next page using a cursor without recomputing total count", async () => {
    mockCustomExercises.searchLibrary.mockResolvedValueOnce({
      items: [exerciseDoc({ id: "ex-3", name: "Cable Fly", nameLower: "cable fly" })],
      nextCursor: null,
    });

    const page = await browseExerciseLibrary("gym-a", {
      startAfterId: "ex-2",
    });

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeNull();
    expect(page.totalCount).toBe(0);
    expect(mockCustomExercises.countByGym).not.toHaveBeenCalled();
    expect(mockCustomExercises.searchLibrary).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
      expect.objectContaining({ startAfterId: "ex-2" }),
    );
  });

  it("does not duplicate items when appending pages client-side", async () => {
    mockCustomExercises.searchLibrary
      .mockResolvedValueOnce({
        items: [exerciseDoc({ id: "ex-1" })],
        nextCursor: "ex-1",
      })
      .mockResolvedValueOnce({
        items: [exerciseDoc({ id: "ex-1" }), exerciseDoc({ id: "ex-2", name: "Row" })],
        nextCursor: null,
      });
    mockCustomExercises.countByGym.mockResolvedValueOnce(2);

    const first = await browseExerciseLibrary("gym-a");
    const second = await browseExerciseLibrary("gym-a", {
      startAfterId: first.nextCursor,
    });

    const merged = [...first.items, ...second.items.filter((item) => item.id !== "ex-1")];
    expect(merged.map((item) => item.id)).toEqual(["ex-1", "ex-2"]);
  });

  it("preserves source badges for seeded, catalog, and custom exercises", async () => {
    mockCustomExercises.searchLibrary.mockResolvedValueOnce({
      items: [
        exerciseDoc({ id: "seed-1", isSeeded: true }),
        exerciseDoc({
          id: "cat-1",
          isSeeded: false,
          exerciseSource: "CATALOG",
          catalogId: "dev-push-up",
        }),
        exerciseDoc({ id: "custom-1", isSeeded: false, exerciseSource: "CUSTOM" }),
      ],
      nextCursor: null,
    });
    mockCustomExercises.countByGym.mockResolvedValueOnce(3);

    const page = await browseExerciseLibrary("gym-a");

    expect(page.items.map((item) => item.exerciseSource)).toEqual([
      "SEEDED",
      "CATALOG",
      "CUSTOM",
    ]);
  });
});

describe("searchExerciseLibrary pagination", () => {
  it("returns search pages with cursor metadata", async () => {
    mockCustomExercises.searchLibrary.mockResolvedValueOnce({
      items: [exerciseDoc({ id: "ex-1", name: "Push Up" })],
      nextCursor: "ex-1",
    });

    const page = await searchExerciseLibrary("gym-a", {
      query: "push",
      muscleGroup: "CHEST",
      startAfterId: "ex-0",
      limit: 30,
    });

    expect(page.nextCursor).toBe("ex-1");
    expect(mockCustomExercises.searchLibrary).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
      expect.objectContaining({
        query: "push",
        muscleGroup: "CHEST",
        startAfterId: "ex-0",
        limit: 30,
      }),
    );
  });
});

describe("CustomExercisesRepository.searchLibrary cursor validation", () => {
  it("rejects malformed cursors", async () => {
    const repo = new CustomExercisesRepository({} as never);

    await expect(
      repo.searchLibrary({ kind: "platform" }, "gym-a", {
        startAfterId: "../bad-cursor",
      }),
    ).rejects.toBeInstanceOf(InvalidPaginationCursorError);
  });

  it("rejects missing cursor documents", async () => {
    const get = vi.fn().mockResolvedValue({ exists: false });
    const db = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({ get })),
      })),
    };
    const repo = new CustomExercisesRepository(db as never);

    await expect(
      repo.searchLibrary({ kind: "platform" }, "gym-a", {
        startAfterId: "missingdoc123456789012345",
      }),
    ).rejects.toBeInstanceOf(InvalidPaginationCursorError);
  });

  it("rejects cross-gym cursor documents", async () => {
    const get = vi.fn().mockResolvedValue({
      exists: true,
      id: "exothergym123456789012345",
      data: () =>
        exerciseDoc({
          id: "exothergym123456789012345",
          gymId: "gym-b",
          name: "Other Gym Move",
          nameLower: "other gym move",
        }),
    });
    const db = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({ get })),
      })),
    };
    const repo = new CustomExercisesRepository(db as never);

    await expect(
      repo.searchLibrary({ kind: "platform" }, "gym-a", {
        startAfterId: "exothergym123456789012345",
      }),
    ).rejects.toBeInstanceOf(TenantIsolationError);
  });

  it("orders by nameLower with document id tie-breaker", async () => {
    const docs = [
      {
        id: "bbb",
        data: () =>
          exerciseDoc({
            id: "bbb",
            name: "Alpha",
            nameLower: "alpha",
          }),
      },
      {
        id: "aaa",
        data: () =>
          exerciseDoc({
            id: "aaa",
            name: "Alpha",
            nameLower: "alpha",
          }),
      },
    ];

    const get = vi.fn().mockResolvedValue({ exists: false });
    const limit = vi.fn().mockReturnValue({
      startAfter: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ docs }),
      }),
      get: vi.fn().mockResolvedValue({ docs }),
    });
    const orderByDocId = vi.fn().mockReturnValue({ limit });
    const orderByName = vi.fn().mockReturnValue({ orderBy: orderByDocId });
    const whereGym = vi.fn().mockReturnValue({ orderBy: orderByName });
    const db = {
      collection: vi.fn(() => ({
        where: whereGym,
        doc: vi.fn(() => ({ get })),
      })),
    };

    const repo = new CustomExercisesRepository(db as never);
    const page = await repo.searchLibrary({ kind: "platform" }, "gym-a", { limit: 50 });

    expect(whereGym).toHaveBeenCalledWith("gymId", "==", "gym-a");
    expect(orderByName).toHaveBeenCalledWith("nameLower", "asc");
    expect(orderByDocId).toHaveBeenCalled();
    expect(page.items.map((item) => item.id)).toEqual(["bbb", "aaa"]);
  });
});
