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
});
