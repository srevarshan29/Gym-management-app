import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MemberContext } from "@/lib/firestore/context";
import { NutritionMemberFoodsRepository } from "@/lib/firestore/repositories/nutrition-member-foods";

const memberA: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-a",
};

describe("NutritionMemberFoodsRepository member isolation", () => {
  const getMock = vi.fn();
  const setMock = vi.fn();

  beforeEach(() => {
    getMock.mockReset();
    setMock.mockReset();
  });

  it("blocks favorite update when context memberId does not match", async () => {
    getMock.mockResolvedValue({ exists: false });

    const repo = new NutritionMemberFoodsRepository({
      collection: () => ({
        doc: () => ({
          get: getMock,
          set: setMock,
        }),
      }),
    } as never);

    await expect(
      repo.setFavorite(memberA, "gym-a", "member-other", "usda:1", true),
    ).rejects.toThrow(/Member isolation/);
    expect(setMock).not.toHaveBeenCalled();
  });

  it("writes favorite fields when favoriting", async () => {
    getMock.mockResolvedValue({ exists: false });
    setMock.mockResolvedValue(undefined);

    const repo = new NutritionMemberFoodsRepository({
      collection: () => ({
        doc: () => ({
          get: getMock,
          set: setMock,
        }),
      }),
    } as never);

    await repo.setFavorite(memberA, "gym-a", "member-a", "usda:1", true);
    expect(setMock).toHaveBeenCalled();
    const payload = setMock.mock.calls[0]?.[0];
    expect(payload.isFavorite).toBe(true);
    expect(payload.favoritedAt).toBeTruthy();
  });
});
