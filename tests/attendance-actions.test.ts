import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireGym, checkInMemberByNumberMock } = vi.hoisted(() => ({
  requireGym: vi.fn(),
  checkInMemberByNumberMock: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireGym }));
vi.mock("@/lib/permissions", () => ({
  canManageMembers: (role: string) => role !== "MEMBER",
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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
vi.mock("@/lib/attendance/queries", () => ({
  getMemberAttendanceHistory: vi.fn(async () => []),
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
});
