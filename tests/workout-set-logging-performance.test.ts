import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireMember, logWorkoutSetRecord } = vi.hoisted(() => ({
  requireMember: vi.fn(),
  logWorkoutSetRecord: vi.fn(),
}));

import { logWorkoutSet } from "@/app/actions/workout-sessions";

vi.mock("@/lib/member-session", () => ({
  requireMember,
}));

vi.mock("@/lib/firestore/workout-session-operations", () => ({
  logWorkoutSetRecord,
}));

describe("logWorkoutSet action", () => {
  beforeEach(() => {
    requireMember.mockReset();
    logWorkoutSetRecord.mockReset();
    requireMember.mockResolvedValue({
      gymId: "gym-a",
      memberId: "member-1",
    });
  });

  it("returns logged set data without route revalidation", async () => {
    logWorkoutSetRecord.mockResolvedValue({
      sessionExerciseId: "sess-ex-a",
      set: {
        setNumber: 1,
        weightKg: 80,
        durationSeconds: null,
      },
    });

    const result = await logWorkoutSet({
      sessionExerciseId: "sess-ex-a",
      setNumber: 1,
      weightKg: 80,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        sessionExerciseId: "sess-ex-a",
        set: {
          setNumber: 1,
          weightKg: 80,
          durationSeconds: null,
        },
      });
    }
    expect(logWorkoutSetRecord).toHaveBeenCalledWith(
      { kind: "member", gymId: "gym-a", memberId: "member-1" },
      {
        sessionExerciseId: "sess-ex-a",
        setNumber: 1,
        weightKg: 80,
      },
    );
  });

  it("rejects unauthorized cross-member logging via member session context", async () => {
    requireMember.mockResolvedValue({
      gymId: "gym-a",
      memberId: "member-2",
    });
    logWorkoutSetRecord.mockRejectedValue(
      new Error("Workout session not found."),
    );

    const result = await logWorkoutSet({
      sessionExerciseId: "sess-ex-a",
      setNumber: 1,
      weightKg: 80,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not found/i);
    }
  });
});
