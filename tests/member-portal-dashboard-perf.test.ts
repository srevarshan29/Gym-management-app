import { describe, expect, it } from "vitest";

import type { MemberPortalDashboardStateDoc } from "@/lib/firestore/types";
import {
  dashboardStateNeedsPersist,
  dashboardStatePatchFromMessage,
} from "@/lib/member-portal/dashboard-state-sync";
import { resolveDashboardMessage } from "@/lib/member-portal/dashboard-message-engine";
import { isWorkoutCompletedTodaySuggestion } from "@/lib/workout-tracking/workout-completed-today";

const baseCtx = {
  dateKey: "2026-10-11",
  memberId: "m1",
  memberName: "Ragesh Kumar",
  suggestion: {
    kind: "suggested" as const,
    dayId: "d1",
    label: "Push Day",
    exerciseCount: 6,
    estimatedMinutes: 45,
  },
  workoutCompletedToday: false,
  caloriePercent: 40,
  calorieGoalComplete: false,
  waterPercent: 30,
  waterGoalComplete: false,
  waterRemainingMl: 2100,
  recentMessageKeys: [],
  greetingDateKey: null,
  greetingMessageKey: null,
  celebratedCalorieDateKey: null,
  celebratedWaterDateKey: null,
};

describe("dashboard state persistence", () => {
  it("skips write when recent keys unchanged on repeat resolve", () => {
    const first = resolveDashboardMessage(baseCtx);
    const stored = {
      gymId: "g1",
      memberId: "m1",
      recentMessageKeys: first.patchRecentMessageKeys,
      greetingDateKey: first.patchGreetingDateKey,
      greetingMessageKey: first.patchGreetingMessageKey,
      celebratedCalorieDateKey: first.patchCelebratedCalorieDateKey,
      celebratedWaterDateKey: first.patchCelebratedWaterDateKey,
      updatedAt: {} as MemberPortalDashboardStateDoc["updatedAt"],
    } satisfies MemberPortalDashboardStateDoc;
    const second = resolveDashboardMessage({
      ...baseCtx,
      recentMessageKeys: first.patchRecentMessageKeys,
    });
    const patch = dashboardStatePatchFromMessage(second);
    expect(dashboardStateNeedsPersist(stored, patch)).toBe(false);
  });

  it("persists when celebration date keys advance", () => {
    const message = resolveDashboardMessage({
      ...baseCtx,
      waterGoalComplete: true,
      waterPercent: 100,
      waterRemainingMl: 0,
    });
    const patch = dashboardStatePatchFromMessage(message);
    expect(dashboardStateNeedsPersist(null, patch)).toBe(true);
    expect(message.patchCelebratedWaterDateKey).toBe(baseCtx.dateKey);
  });
});

describe("workout completed today signal", () => {
  it("maps completed_today suggestion to dashboard flag", () => {
    expect(
      isWorkoutCompletedTodaySuggestion({
        kind: "completed_today",
        completedLabel: "Push",
        next: null,
      }),
    ).toBe(true);
    expect(
      isWorkoutCompletedTodaySuggestion({
        kind: "suggested",
        dayId: "d1",
        label: "Push",
        exerciseCount: 1,
        estimatedMinutes: 30,
      }),
    ).toBe(false);
  });
});

describe("resolveDashboardMessage repeat visits", () => {
  it("does not grow recentMessageKeys when message is unchanged", () => {
    const first = resolveDashboardMessage(baseCtx);
    const second = resolveDashboardMessage({
      ...baseCtx,
      recentMessageKeys: first.patchRecentMessageKeys,
    });
    expect(second.patchRecentMessageKeys).toEqual(first.patchRecentMessageKeys);
  });
});
