import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockMergeForMember, mockRequireMember } = vi.hoisted(() => ({
  mockMergeForMember: vi.fn(),
  mockRequireMember: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/member-session", () => ({
  requireMember: mockRequireMember,
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    memberPortalDashboardState: {
      mergeForMember: mockMergeForMember,
      getForMember: vi.fn().mockResolvedValue(null),
    },
  }),
}));

import {
  updateMemberDailyWaterGoalAction,
  updateMemberWeeklyAttendanceGoalAction,
} from "@/app/actions/member-dashboard";

const session = {
  gymId: "gym-alpha",
  memberId: "member-42",
  name: "Test Member",
  memberNumber: 7,
};

describe("member dashboard goal server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireMember.mockResolvedValue(session);
    mockMergeForMember.mockResolvedValue(null);
  });

  describe("updateMemberDailyWaterGoalAction", () => {
    it("requires an authenticated member session", async () => {
      mockRequireMember.mockRejectedValue(new Error("Unauthorized"));
      const result = await updateMemberDailyWaterGoalAction({ targetMl: 3000 });
      expect(result.ok).toBe(false);
      expect(mockMergeForMember).not.toHaveBeenCalled();
    });

    it("validates water targets on 50 ml increments within bounds", async () => {
      const invalid = await updateMemberDailyWaterGoalAction({ targetMl: 400 });
      expect(invalid.ok).toBe(false);
      expect(mockMergeForMember).not.toHaveBeenCalled();

      const valid = await updateMemberDailyWaterGoalAction({ targetMl: 2650 });
      expect(valid.ok).toBe(true);
      if (!valid.ok || !valid.data) throw new Error("expected success");
      expect(valid.data.targetMl).toBe(2650);
    });

    it("persists through member-scoped dashboard state merge", async () => {
      const result = await updateMemberDailyWaterGoalAction({ targetMl: 2500 });
      expect(result.ok).toBe(true);
      expect(mockMergeForMember).toHaveBeenCalledWith(
        {
          kind: "member",
          gymId: "gym-alpha",
          memberId: "member-42",
        },
        "gym-alpha",
        "member-42",
        { dailyWaterTargetMl: 2500 },
      );
    });

    it("returns a friendly error when persistence fails", async () => {
      mockMergeForMember.mockRejectedValue(new Error("Firestore unavailable"));
      const result = await updateMemberDailyWaterGoalAction({ targetMl: 3000 });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.error).toMatch(/Firestore unavailable|Could not save/i);
    });
  });

  describe("updateMemberWeeklyAttendanceGoalAction", () => {
    it("requires an authenticated member session", async () => {
      mockRequireMember.mockRejectedValue(new Error("Unauthorized"));
      const result = await updateMemberWeeklyAttendanceGoalAction({
        targetDays: 4,
      });
      expect(result.ok).toBe(false);
      expect(mockMergeForMember).not.toHaveBeenCalled();
    });

    it("validates weekly targets between 1 and 7 days", async () => {
      const invalid = await updateMemberWeeklyAttendanceGoalAction({
        targetDays: 0,
      });
      expect(invalid.ok).toBe(false);
      expect(mockMergeForMember).not.toHaveBeenCalled();

      const valid = await updateMemberWeeklyAttendanceGoalAction({
        targetDays: 6,
      });
      expect(valid.ok).toBe(true);
      if (!valid.ok || !valid.data) throw new Error("expected success");
      expect(valid.data.targetDays).toBe(6);
    });

    it("isolates persistence to the signed-in gym and member", async () => {
      mockRequireMember.mockResolvedValue({
        ...session,
        gymId: "gym-beta",
        memberId: "member-99",
      });
      await updateMemberWeeklyAttendanceGoalAction({ targetDays: 3 });
      expect(mockMergeForMember).toHaveBeenCalledWith(
        {
          kind: "member",
          gymId: "gym-beta",
          memberId: "member-99",
        },
        "gym-beta",
        "member-99",
        { weeklyAttendanceTarget: 3 },
      );
    });

    it("returns a friendly error when persistence fails", async () => {
      mockMergeForMember.mockRejectedValue(new Error("write denied"));
      const result = await updateMemberWeeklyAttendanceGoalAction({
        targetDays: 5,
      });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected failure");
      expect(result.error).toMatch(/write denied|Could not save/i);
    });
  });
});
