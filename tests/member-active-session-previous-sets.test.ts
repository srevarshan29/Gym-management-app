import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadActiveWorkoutPreviousSetsAction } from "@/app/actions/workout-sessions";
import type { MemberContext } from "@/lib/firestore/context";
import { loadPreviousSetsForActiveMemberSession } from "@/lib/workout-tracking/member-active-session-previous-sets";

const memberCtx: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-1",
};

const getPreviousSetsForSessionExercises = vi.fn();
const getActiveSessionForMember = vi.fn();
const findByMemberId = vi.fn();
const listCompletedForMember = vi.fn();

vi.mock("@/lib/workout-tracking/previous-sets", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/workout-tracking/previous-sets")
  >();
  return {
    ...actual,
    getPreviousSetsForSessionExercises: (...args: unknown[]) =>
      getPreviousSetsForSessionExercises(...args),
  };
});

vi.mock("@/lib/member-session", () => ({
  requireMember: vi.fn().mockResolvedValue({
    gymId: "gym-a",
    memberId: "member-1",
    name: "Test",
    memberNumber: 1,
  }),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: vi.fn(),
}));

import { getRepositories } from "@/lib/firestore";

function activeSessionDoc() {
  return {
    id: "session-1",
    gymId: "gym-a",
    memberId: "member-1",
    workoutPlanId: "plan-1",
    workoutPlanDayId: "day-1",
    status: "IN_PROGRESS",
    startedAt: Timestamp.now(),
    completedAt: null,
    durationSeconds: null,
    exercises: [
      {
        id: "sess-ex-a",
        workoutPlanExerciseId: "row-a",
        sortOrder: 0,
        exerciseId: "ex-bench",
        customName: null,
        trackingTypeOverride: null,
        targetReps: "8",
        sets: [],
      },
    ],
  };
}

function samplePlan() {
  return {
    id: "plan-1",
    gymId: "gym-a",
    memberId: "member-1",
    memberName: "Test",
    title: "Plan",
    durationWeeks: null,
    focusGoal: null,
    days: [
      {
        id: "day-1",
        label: "Day 1",
        sortOrder: 0,
        exercises: [
          {
            id: "row-a",
            exerciseId: "ex-bench",
            customName: null,
            sortOrder: 0,
            targetSets: 3,
            targetReps: "8",
            tempo: null,
            restSeconds: 90,
            targetWeightKg: null,
            trackingTypeOverride: null,
          },
        ],
      },
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

describe("member workout page loader", () => {
  it("does not await previous-set history on the server page load path", () => {
    const source = readFileSync(
      resolve("src/lib/workout-tracking/member-workout-page.ts"),
      "utf8",
    );
    expect(source).not.toContain("getPreviousSetsForSessionExercises");
    expect(source).toMatch(/previousSets:\s*\{\}/);
  });
});

describe("loadPreviousSetsForActiveMemberSession", () => {
  beforeEach(() => {
    getPreviousSetsForSessionExercises.mockReset();
    getActiveSessionForMember.mockReset();
    findByMemberId.mockReset();
    listCompletedForMember.mockReset();
    vi.mocked(getRepositories).mockReturnValue({
      workoutPlans: { findByMemberId },
      workoutSessions: {
        getActiveSessionForMember,
        listCompletedForMember,
      },
      memberPersonalWorkouts: { getForMember: vi.fn() },
    } as never);
    findByMemberId.mockResolvedValue(samplePlan());
    getPreviousSetsForSessionExercises.mockResolvedValue({
      "sess-ex-a": [{ setNumber: 1, weightKg: 60, durationSeconds: null }],
    });
  });

  it("returns null when the session is not active for this member", async () => {
    getActiveSessionForMember.mockResolvedValue(null);

    const result = await loadPreviousSetsForActiveMemberSession(
      memberCtx,
      "session-other",
    );

    expect(result).toBeNull();
    expect(getPreviousSetsForSessionExercises).not.toHaveBeenCalled();
  });

  it("loads previous sets for the verified active session", async () => {
    getActiveSessionForMember.mockResolvedValue(activeSessionDoc());

    const result = await loadPreviousSetsForActiveMemberSession(
      memberCtx,
      "session-1",
    );

    expect(getActiveSessionForMember).toHaveBeenCalledWith(
      memberCtx,
      "gym-a",
      "member-1",
      "session-1",
    );
    expect(getPreviousSetsForSessionExercises).toHaveBeenCalled();
    expect(result?.["sess-ex-a"]).toEqual([
      { setNumber: 1, weightKg: 60, durationSeconds: null },
    ]);
  });
});

describe("loadActiveWorkoutPreviousSetsAction", () => {
  beforeEach(() => {
    getActiveSessionForMember.mockReset();
    getPreviousSetsForSessionExercises.mockReset();
    findByMemberId.mockReset();
    vi.mocked(getRepositories).mockReturnValue({
      workoutPlans: { findByMemberId },
      workoutSessions: { getActiveSessionForMember },
      memberPersonalWorkouts: { getForMember: vi.fn() },
    } as never);
    findByMemberId.mockResolvedValue(samplePlan());
  });

  it("rejects cross-member session access", async () => {
    getActiveSessionForMember.mockResolvedValue(null);

    const result = await loadActiveWorkoutPreviousSetsAction("session-x");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not found/i);
    }
  });

  it("returns previous sets when the active session belongs to the member", async () => {
    getActiveSessionForMember.mockResolvedValue(activeSessionDoc());
    getPreviousSetsForSessionExercises.mockResolvedValue({
      "sess-ex-a": [{ setNumber: 1, weightKg: 70, durationSeconds: null }],
    });

    const result = await loadActiveWorkoutPreviousSetsAction("session-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.["sess-ex-a"]?.[0]?.weightKg).toBe(70);
    }
  });

  it("returns a non-throwing error when history loading fails", async () => {
    getActiveSessionForMember.mockResolvedValue(activeSessionDoc());
    getPreviousSetsForSessionExercises.mockRejectedValue(
      new Error("Firestore unavailable"),
    );

    const result = await loadActiveWorkoutPreviousSetsAction("session-1");

    expect(result.ok).toBe(false);
  });
});

describe("member active workout session UI", () => {
  it("loads previous sets after mount without blocking the session view", () => {
    const source = readFileSync(
      resolve(
        "src/components/member-portal/workout/member-active-workout-session.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("loadActiveWorkoutPreviousSetsAction");
    expect(source).toContain("WorkoutSessionView");
    expect(source).toContain("cancelled");
  });

  it("derives input defaults from previous sets without overwriting user values", () => {
    const source = readFileSync(
      resolve("src/components/member-portal/workout/workout-session-view.tsx"),
      "utf8",
    );
    expect(source).toContain("setValues[key] ?? fallback");
  });
});
