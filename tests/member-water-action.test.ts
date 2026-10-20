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
    const operationId = "550e8400-e29b-41d4-a716-446655440000";
    const result = await addMemberWaterAction({
      logDate: "2026-10-11",
      amountMl: 250,
      operationId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.data == null) throw new Error("expected success");
    expect(result.data.consumedMl).toBe(500);
    expect(mockAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "member", memberId: "m1", gymId: "gym-1" }),
      "gym-1",
      "m1",
      "2026-10-11",
      250,
      operationId,
    );
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("forwards the same operationId on retry without duplicating persistence", async () => {
    const operationId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    mockAddEntry.mockResolvedValue({ totalMl: 750 });

    const first = await addMemberWaterAction({
      logDate: "2026-10-11",
      amountMl: 250,
      operationId,
    });
    const second = await addMemberWaterAction({
      logDate: "2026-10-11",
      amountMl: 250,
      operationId,
    });

    expect(first.ok && second.ok).toBe(true);
    expect(mockAddEntry).toHaveBeenCalledTimes(2);
    expect(mockAddEntry.mock.calls[0]?.[5]).toBe(operationId);
    expect(mockAddEntry.mock.calls[1]?.[5]).toBe(operationId);
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
