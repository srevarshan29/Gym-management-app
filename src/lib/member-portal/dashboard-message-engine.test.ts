import { describe, expect, it } from "vitest";

import { DASHBOARD_MESSAGE_LIBRARY } from "@/lib/member-portal/dashboard-message-library";
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
  visitsThisWeek: 2,
  daysSinceLastVisit: 1,
  recentMessageKeys: [],
  greetingDateKey: null,
  greetingMessageKey: null,
  celebratedCalorieDateKey: null,
  celebratedWaterDateKey: null,
};

describe("dashboard message library", () => {
  it("has at least 100 distinct messages", () => {
    expect(DASHBOARD_MESSAGE_LIBRARY.length).toBeGreaterThanOrEqual(100);
    const keys = new Set(DASHBOARD_MESSAGE_LIBRARY.map((m) => m.key));
    expect(keys.size).toBe(DASHBOARD_MESSAGE_LIBRARY.length);
  });
});

describe("resolveDashboardMessage", () => {
  it("does not congratulate incomplete calorie goals", () => {
    const result = resolveDashboardMessage(
      { ...baseCtx, calorieGoalComplete: false, caloriePercent: 50 },
      "2.1 L to go",
    );
    expect(result.category).not.toBe("calorie_complete");
    expect(result.category).not.toBe("both_goals_complete");
  });

  it("prioritizes fresh calorie completion", () => {
    const result = resolveDashboardMessage(
      {
        ...baseCtx,
        caloriePercent: 100,
        calorieGoalComplete: true,
        celebratedCalorieDateKey: null,
      },
      "0 ml to go",
    );
    expect(result.category).toBe("calorie_complete");
    expect(result.showCalorieComplete).toBe(true);
    expect(result.patchCelebratedCalorieDateKey).toBe("2026-10-11");
  });

  it("is deterministic for the same context", () => {
    const first = resolveDashboardMessage(baseCtx, "2.1 L to go");
    const second = resolveDashboardMessage(baseCtx, "2.1 L to go");
    expect(second.messageKey).toBe(first.messageKey);
    expect(second.text).toBe(first.text);
  });
});

describe("memberFirstName", () => {
  it("uses first token", () => {
    expect(memberFirstName("Ragesh Kumar")).toBe("Ragesh");
  });
});
