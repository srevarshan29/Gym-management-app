import { describe, expect, it, vi } from "vitest";

import type { FirestoreContext } from "@/lib/firestore/context";
import { MemberWeightMeasurementsRepository } from "@/lib/firestore/repositories/member-weight-measurements";

const memberCtx: FirestoreContext = {
  kind: "member",
  gymId: "gym-1",
  memberId: "m1",
};

const otherMemberCtx: FirestoreContext = {
  kind: "member",
  gymId: "gym-1",
  memberId: "m2",
};

const staffCtx: FirestoreContext = {
  kind: "staff",
  gymId: "gym-1",
  userId: "u1",
  role: "OWNER",
};

describe("MemberWeightMeasurementsRepository access", () => {
  it("blocks members from writing another member's data", async () => {
    const repo = new MemberWeightMeasurementsRepository({} as never);
    await expect(
      repo.addMeasurement(otherMemberCtx, "gym-1", "m1", 70),
    ).rejects.toThrow(/Member isolation/);
  });

  it("allows staff to list without member self-access assertion", async () => {
    const repo = new MemberWeightMeasurementsRepository({
      collection: () => ({
        where: () => ({
          where: () => ({
            orderBy: () => ({
              limit: () => ({
                get: vi.fn().mockResolvedValue({ docs: [] }),
              }),
            }),
          }),
        }),
      }),
    } as never);

    const rows = await repo.listForMember(staffCtx, "gym-1", "m1");
    expect(rows).toEqual([]);
  });

  it("validates weight on add", async () => {
    const create = vi.fn();
    const get = vi.fn().mockResolvedValue({
      exists: true,
      id: "x",
      data: () => ({
        gymId: "gym-1",
        memberId: "m1",
        weightKg: 70,
        recordedAt: { toDate: () => new Date() },
        createdAt: { toDate: () => new Date() },
      }),
    });
    const repo = new MemberWeightMeasurementsRepository({
      collection: () => ({
        doc: () => ({ create, get }),
      }),
    } as never);

    await expect(
      repo.addMeasurement(memberCtx, "gym-1", "m1", 9999),
    ).rejects.toThrow(/valid weight/);
    expect(create).not.toHaveBeenCalled();
  });
});
