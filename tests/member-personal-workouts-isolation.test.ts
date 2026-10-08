import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MemberContext } from "@/lib/firestore/context";
import { MemberPersonalWorkoutsRepository } from "@/lib/firestore/repositories/member-personal-workouts";

const memberA: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-a",
};

describe("MemberPersonalWorkoutsRepository isolation", () => {
  const getMock = vi.fn();
  const updateMock = vi.fn();

  beforeEach(() => {
    getMock.mockReset();
    updateMock.mockReset();
  });

  it("refuses update when memberId does not match context", async () => {
    getMock.mockResolvedValue({
      exists: true,
      data: () => ({
        gymId: "gym-a",
        memberId: "member-other",
        name: "Leg day",
        exercises: [],
      }),
    });

    const repo = new MemberPersonalWorkoutsRepository({
      collection: () => ({
        doc: () => ({
          get: getMock,
          update: updateMock,
        }),
      }),
    } as never);

    await expect(
      repo.updateForMember(memberA, "gym-a", "member-a", "workout-1", {
        name: "Hack",
        exercises: [],
      }),
    ).rejects.toThrow();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
