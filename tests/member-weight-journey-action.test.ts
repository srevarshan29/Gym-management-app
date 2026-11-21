import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireMember = vi.fn();
const mockAddMeasurement = vi.fn();
const mockMergeForMember = vi.fn();

vi.mock("@/lib/member-session", () => ({
  requireMember: () => mockRequireMember(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    memberWeightMeasurements: {
      addMeasurement: mockAddMeasurement,
    },
    memberPortalDashboardState: {
      mergeForMember: mockMergeForMember,
    },
  }),
}));

import {
  logMemberWeightMeasurementAction,
  setMemberWeightJourneyStartAction,
  setMemberWeightJourneyTargetAction,
} from "@/app/actions/member-weight-journey";

describe("member weight journey actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireMember.mockResolvedValue({
      gymId: "gym-a",
      memberId: "member-a",
    });
    mockAddMeasurement.mockResolvedValue({ id: "w1" });
    mockMergeForMember.mockResolvedValue({});
  });

  it("logs weight for authenticated member only", async () => {
    const result = await logMemberWeightMeasurementAction({ weightKg: 72.2 });
    expect(result.ok).toBe(true);
    expect(mockAddMeasurement).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "member",
        gymId: "gym-a",
        memberId: "member-a",
      }),
      "gym-a",
      "member-a",
      72.2,
    );
  });

  it("rejects invalid weight without writing", async () => {
    const result = await logMemberWeightMeasurementAction({ weightKg: 5 });
    expect(result.ok).toBe(false);
    expect(mockAddMeasurement).not.toHaveBeenCalled();
  });

  it("updates target via dashboard state", async () => {
    const result = await setMemberWeightJourneyTargetAction({ targetKg: 68 });
    expect(result.ok).toBe(true);
    expect(mockMergeForMember).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "member", memberId: "member-a" }),
      "gym-a",
      "member-a",
      { weightJourneyTargetKg: 68 },
    );
  });

  it("updates starting weight via dashboard state", async () => {
    const result = await setMemberWeightJourneyStartAction({ startKg: 92 });
    expect(result.ok).toBe(true);
    expect(mockMergeForMember).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "member", memberId: "member-a" }),
      "gym-a",
      "member-a",
      { weightJourneyStartKg: 92 },
    );
  });

  it("clears custom trailhead", async () => {
    const result = await setMemberWeightJourneyStartAction({ startKg: null });
    expect(result.ok).toBe(true);
    expect(mockMergeForMember).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: "member-a" }),
      "gym-a",
      "member-a",
      { weightJourneyStartKg: null },
    );
  });
});

describe("member weight isolation", () => {
  it("uses session memberId — not client supplied", async () => {
    mockRequireMember.mockResolvedValue({
      gymId: "gym-a",
      memberId: "member-a",
    });
    await logMemberWeightMeasurementAction({ weightKg: 80 });
    const call = mockAddMeasurement.mock.calls[0]!;
    expect(call[2]).toBe("member-a");
    expect(call[1]).toBe("gym-a");
  });
});
