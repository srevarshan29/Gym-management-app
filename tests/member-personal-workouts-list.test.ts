import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import type { MemberContext } from "@/lib/firestore/context";
import { listMemberPersonalWorkouts } from "@/lib/workout-tracking/member-personal-workouts";

const memberCtx: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-a",
};

vi.mock("@/lib/firestore", () => ({
  getRepositories: vi.fn(),
}));

import { getRepositories } from "@/lib/firestore";

describe("listMemberPersonalWorkouts", () => {
  it("includes catalog ids from embedded exercises", async () => {
    const listForMember = vi.fn().mockResolvedValue([
      {
        id: "w2",
        gymId: "gym-a",
        memberId: "member-a",
        name: "Push",
        exercises: [
          {
            id: "ex-1",
            catalogId: "cat-a",
            sortOrder: 0,
            targetSets: 3,
            targetReps: "10",
          },
        ],
        createdAt: Timestamp.fromMillis(1_000),
        updatedAt: Timestamp.fromMillis(2_000),
      },
    ]);

    vi.mocked(getRepositories).mockReturnValue({
      memberPersonalWorkouts: { listForMember },
    } as never);

    const rows = await listMemberPersonalWorkouts(memberCtx);
    expect(rows[0]?.catalogIds).toEqual(["cat-a"]);
    expect(rows[0]?.exerciseCount).toBe(1);
  });

  it("maps repository rows without throwing when exercises is missing", async () => {
    const listForMember = vi.fn().mockResolvedValue([
      {
        id: "w1",
        gymId: "gym-a",
        memberId: "member-a",
        name: "Leg day",
        exercises: undefined as unknown as [],
        createdAt: Timestamp.fromMillis(2_000),
        updatedAt: Timestamp.fromMillis(3_000),
      },
    ]);

    vi.mocked(getRepositories).mockReturnValue({
      memberPersonalWorkouts: { listForMember },
    } as never);

    const rows = await listMemberPersonalWorkouts(memberCtx);
    expect(rows).toEqual([
      {
        id: "w1",
        name: "Leg day",
        exerciseCount: 0,
        catalogIds: [],
        updatedAt: new Date(3_000).toISOString(),
      },
    ]);
  });
});
