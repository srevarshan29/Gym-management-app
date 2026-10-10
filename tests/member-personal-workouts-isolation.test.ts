import { Timestamp } from "firebase-admin/firestore";
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
  const orderByMock = vi.fn();

  beforeEach(() => {
    getMock.mockReset();
    updateMock.mockReset();
    orderByMock.mockReset();
  });

  it("lists workouts with gymId+memberId only (no orderBy index) and sorts by updatedAt", async () => {
    getMock.mockResolvedValue({
      docs: [
        {
          id: "older",
          data: () => ({
            gymId: "gym-a",
            memberId: "member-a",
            name: "Older",
            exercises: [],
            updatedAt: Timestamp.fromMillis(1_000),
            createdAt: Timestamp.fromMillis(1_000),
          }),
        },
        {
          id: "newer",
          data: () => ({
            gymId: "gym-a",
            memberId: "member-a",
            name: "Newer",
            exercises: [{ id: "e1", catalogId: "c1", sortOrder: 0, targetSets: 3, targetReps: "10" }],
            updatedAt: Timestamp.fromMillis(5_000),
            createdAt: Timestamp.fromMillis(5_000),
          }),
        },
      ],
    });

    const whereMember = vi.fn().mockReturnValue({ get: getMock });
    const whereGym = vi.fn().mockReturnValue({ where: whereMember });
    orderByMock.mockReturnValue({ limit: vi.fn(), get: getMock });

    const repo = new MemberPersonalWorkoutsRepository({
      collection: () => ({
        where: whereGym,
      }),
    } as never);

    const rows = await repo.listForMember(memberA, "gym-a", "member-a");
    expect(whereGym).toHaveBeenCalledWith("gymId", "==", "gym-a");
    expect(whereMember).toHaveBeenCalledWith("memberId", "==", "member-a");
    expect(orderByMock).not.toHaveBeenCalled();
    expect(rows.map((r) => r.id)).toEqual(["newer", "older"]);
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
