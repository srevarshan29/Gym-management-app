import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireGym, checkInMemberByNumberMock } = vi.hoisted(() => ({
  requireGym: vi.fn(),
  checkInMemberByNumberMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireGym }));
vi.mock("@/lib/permissions", () => ({
  canManageMembers: (role: string) => role !== "MEMBER",
}));
vi.mock("@/lib/firestore/session-context", () => ({
  staffContextFromUser: (user: { id: string; gymId: string }) => ({
    kind: "staff",
    gymId: user.gymId,
    userId: user.id,
  }),
}));
vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    members: {},
    attendance: {},
  }),
}));
vi.mock("@/lib/attendance/check-in", () => ({
  checkInMemberByNumber: checkInMemberByNumberMock,
}));

import { checkInByMemberNumberAction } from "@/app/actions/attendance";

describe("checkInByMemberNumberAction authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireGym.mockResolvedValue({
      id: "staff-1",
      gymId: "gym-a",
      role: "STAFF",
    });
    checkInMemberByNumberMock.mockResolvedValue({
      status: "success",
      memberId: "m1",
      memberNumber: 72,
      memberName: "Rahul",
      checkedInAt: new Date(),
      photoUrl: null,
      gender: "MALE",
    });
  });

  it("rejects non-authorized users", async () => {
    requireGym.mockResolvedValue({
      id: "mem-1",
      gymId: "gym-a",
      role: "MEMBER",
    });
    const fd = new FormData();
    fd.set("memberNumber", "72");
    const result = await checkInByMemberNumberAction(undefined, fd);
    expect(result.ok).toBe(false);
    expect(checkInMemberByNumberMock).not.toHaveBeenCalled();
  });

  it("checks in when member number is submitted (same payload as pressing Enter)", async () => {
    const fd = new FormData();
    fd.set("memberNumber", "72");
    const result = await checkInByMemberNumberAction(undefined, fd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.status).toBe("success");
    }
    expect(checkInMemberByNumberMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ kind: "staff", gymId: "gym-a" }),
      "gym-a",
      "72",
    );
  });

  it("returns invalid input for malformed member numbers", async () => {
    const fd = new FormData();
    fd.set("memberNumber", "abc");
    const result = await checkInByMemberNumberAction(undefined, fd);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Enter a valid member number.");
    }
  });

  it("allows a later check-in for the same member on the same day", async () => {
    checkInMemberByNumberMock
      .mockResolvedValueOnce({
        status: "success",
        memberId: "m1",
        memberNumber: 1,
        memberName: "Rahul",
        checkedInAt: new Date("2026-10-04T07:00:00.000Z"),
        photoUrl: null,
        gender: "MALE",
      })
      .mockResolvedValueOnce({
        status: "success",
        memberId: "m1",
        memberNumber: 1,
        memberName: "Rahul",
        checkedInAt: new Date("2026-10-04T17:30:00.000Z"),
        photoUrl: null,
        gender: "MALE",
      });

    const fd1 = new FormData();
    fd1.set("memberNumber", "1");
    const fd2 = new FormData();
    fd2.set("memberNumber", "1");

    const first = await checkInByMemberNumberAction(undefined, fd1);
    const second = await checkInByMemberNumberAction(undefined, fd2);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(checkInMemberByNumberMock).toHaveBeenCalledTimes(2);
  });
});

describe("guarded check-in submit lock", () => {
  it("prevents overlapping duplicate submits while the first request is in flight", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const action = vi.fn(async (_prev: unknown, _formData: FormData) => {
      await gate;
      return { ok: true as const, data: { status: "success" as const } };
    });

    const lock = { busy: false };
    const guarded = async (
      prev: unknown,
      formData: FormData,
    ): Promise<unknown> => {
      if (lock.busy) return prev;
      lock.busy = true;
      try {
        return await action(prev, formData);
      } finally {
        lock.busy = false;
      }
    };

    const fd = new FormData();
    fd.set("memberNumber", "1");
    const first = guarded(undefined, fd);
    const second = await guarded(undefined, fd);
    expect(second).toBeUndefined();
    expect(action).toHaveBeenCalledTimes(1);
    release();
    await first;
  });
});
