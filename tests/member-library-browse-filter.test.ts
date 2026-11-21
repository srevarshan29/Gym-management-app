import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MemberContext } from "@/lib/firestore/context";
import { browseMemberExerciseCatalog } from "@/lib/workout-tracking/member-catalog-exercises";

const memberCtx: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-a",
};

vi.mock("@/lib/firestore", () => ({
  getRepositories: vi.fn(),
}));

import { getRepositories } from "@/lib/firestore";

describe("browseMemberExerciseCatalog muscle filters", () => {
  const listPage = vi.fn();
  const searchByPrefix = vi.fn();

  beforeEach(() => {
    listPage.mockReset();
    searchByPrefix.mockReset();
    vi.mocked(getRepositories).mockReturnValue({
      exerciseCatalog: { listPage, searchByPrefix },
    } as never);
  });

  it("filters chest by sub-region without changing catalog muscleGroup", async () => {
    listPage.mockResolvedValueOnce({
      items: [
        {
          id: "incline-press",
          catalogId: "incline-press",
          name: "Incline Barbell Bench Press",
          muscleGroup: "CHEST",
          equipment: "barbell",
          isActive: true,
          media: {},
        },
        {
          id: "bench-press",
          catalogId: "bench-press",
          name: "Barbell Bench Press",
          muscleGroup: "CHEST",
          equipment: "barbell",
          isActive: true,
          media: {},
        },
        {
          id: "decline-press",
          catalogId: "decline-press",
          name: "Decline Bench Press",
          muscleGroup: "CHEST",
          equipment: "barbell",
          isActive: true,
          media: {},
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const upper = await browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: "CHEST",
      chestRegion: "UPPER",
    });
    expect(upper.items).toHaveLength(1);
    expect(upper.items[0]?.name).toContain("Incline");
    expect(upper.items[0]?.muscleGroup).toBe("CHEST");

    listPage.mockResolvedValueOnce({
      items: [
        {
          id: "incline-press",
          catalogId: "incline-press",
          name: "Incline Barbell Bench Press",
          muscleGroup: "CHEST",
          equipment: "barbell",
          isActive: true,
          media: {},
        },
        {
          id: "bench-press",
          catalogId: "bench-press",
          name: "Barbell Bench Press",
          muscleGroup: "CHEST",
          equipment: "barbell",
          isActive: true,
          media: {},
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const mid = await browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: "CHEST",
      chestRegion: "MID",
    });
    expect(mid.items.some((row) => row.name.includes("Barbell Bench"))).toBe(
      true,
    );
    expect(mid.items.some((row) => row.name.includes("Incline"))).toBe(false);
  });

  it("filters back by primary lat slug", async () => {
    listPage.mockResolvedValueOnce({
      items: [
        {
          id: "pull-up",
          catalogId: "pull-up",
          name: "Pull-Up",
          muscleGroup: "BACK",
          primaryMuscles: ["latissimus_dorsi"],
          equipment: null,
          isActive: true,
          media: {},
        },
        {
          id: "back-extension",
          catalogId: "back-extension",
          name: "Back Extension",
          muscleGroup: "BACK",
          primaryMuscles: ["erector_spinae"],
          equipment: null,
          isActive: true,
          media: {},
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const lats = await browseMemberExerciseCatalog(memberCtx, {
      muscleGroup: "BACK",
      libraryGroup: "BACK",
      libraryRegion: "lats",
    });
    expect(lats.items).toHaveLength(1);
    expect(lats.items[0]?.catalogId).toBe("pull-up");
  });

  it("filters Chest, Back, and Legs via catalog muscleGroup", async () => {
    for (const group of ["CHEST", "BACK", "LEGS"] as const) {
      listPage.mockResolvedValueOnce({
        items: [
          {
            id: "doc-1",
            catalogId: `${group}-sample`,
            name: "Sample",
            muscleGroup: group,
            equipment: null,
            isActive: true,
            media: {},
          },
        ],
        nextCursor: null,
        hasMore: false,
      });

      const page = await browseMemberExerciseCatalog(memberCtx, {
        muscleGroup: group,
      });
      expect(listPage).toHaveBeenCalledWith(
        memberCtx,
        expect.objectContaining({ muscleGroup: group }),
      );
      expect(page.items[0]?.muscleGroup).toBe(group);
    }
  });

  it("queries full-body and cardio tags server-side", async () => {
    listPage.mockResolvedValueOnce({
      items: [
        {
          id: "burpees",
          catalogId: "burpees",
          name: "Burpees",
          muscleGroup: "CORE",
          equipment: null,
          isActive: true,
          fullBody: true,
          cardio: true,
          media: {},
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    await browseMemberExerciseCatalog(memberCtx, { fullBody: true });
    expect(listPage).toHaveBeenCalledWith(
      memberCtx,
      expect.objectContaining({ fullBody: true, cardio: null }),
    );

    listPage.mockResolvedValueOnce({
      items: [],
      nextCursor: null,
      hasMore: false,
    });

    await browseMemberExerciseCatalog(memberCtx, { cardio: true });
    expect(listPage).toHaveBeenLastCalledWith(
      memberCtx,
      expect.objectContaining({ cardio: true, fullBody: null }),
    );
  });
});
