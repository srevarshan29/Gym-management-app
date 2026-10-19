import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAddEntry, mockMergeForMember, mockRequireMember } = vi.hoisted(
  () => ({
    mockAddEntry: vi.fn(),
    mockMergeForMember: vi.fn(),
    mockRequireMember: vi.fn(),
  }),
);

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/member-session", () => ({
  requireMember: mockRequireMember,
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    memberWaterLogs: {
      addEntry: mockAddEntry,
    },
    memberPortalDashboardState: {
      mergeForMember: mockMergeForMember,
    },
  }),
}));

import { revalidatePath } from "next/cache";
import {
  addMemberWaterAction,
  celebrateMemberWaterGoalAction,
} from "@/app/actions/member-dashboard";

describe("addMemberWaterAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireMember.mockResolvedValue({
      gymId: "gym-1",
      memberId: "m1",
      name: "Test",
      memberNumber: 1,
    });
    mockAddEntry.mockResolvedValue({ totalMl: 500 });
  });

  it("returns updated water progress without revalidating /member", async () => {
    const result = await addMemberWaterAction({
      logDate: "2026-10-11",
      amountMl: 250,
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.data == null) throw new Error("expected success");
    expect(result.data.consumedMl).toBe(500);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("celebrates water goal without revalidating /member", async () => {
    mockMergeForMember.mockResolvedValue(null);
    const result = await celebrateMemberWaterGoalAction({ logDate: "2026-10-11" });
    expect(result.ok).toBe(true);
    expect(mockMergeForMember).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "member", memberId: "m1", gymId: "gym-1" }),
      "gym-1",
      "m1",
      { celebratedWaterDateKey: "2026-10-11" },
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
