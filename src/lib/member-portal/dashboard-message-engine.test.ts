import { describe, expect, it } from "vitest";

import {
  memberFirstName,
  resolveDashboardMessage,
} from "@/lib/member-portal/dashboard-message-engine";

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

describe("resolveDashboardMessage", () => {
  it("does not show completed message without a qualifying workout", () => {
    const result = resolveDashboardMessage(baseCtx);
    expect(result.text.toLowerCase()).not.toContain("session closed");
    expect(result.text.toLowerCase()).not.toContain("done for today");
  });

  it("prioritizes completed workout today", () => {
    const result = resolveDashboardMessage({
      ...baseCtx,
      workoutCompletedToday: true,
    });
    expect(
      result.text.toLowerCase().includes("workout completed") ||
        result.text.toLowerCase().includes("finished today"),
    ).toBe(true);
  });

  it("shows hydration when water is below goal", () => {
    const result = resolveDashboardMessage(baseCtx);
    expect(result.text.toLowerCase()).toContain("hydrat");
  });

  it("is deterministic for the same context", () => {
    const first = resolveDashboardMessage(baseCtx);
    const second = resolveDashboardMessage(baseCtx);
    expect(second.text).toBe(first.text);
  });
});

describe("memberFirstName", () => {
  it("uses first token", () => {
    expect(memberFirstName("Ragesh Kumar")).toBe("Ragesh");
  });
});
