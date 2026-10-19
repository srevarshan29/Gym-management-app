import { describe, expect, it } from "vitest";

import { computeLiveDashboardMessageText } from "@/components/member-portal/dashboard/member-dashboard-water-live";
import type { MemberPortalDashboardData } from "@/lib/member-portal/load-member-portal-dashboard";

const baseDashboard: MemberPortalDashboardData = {
  dateKey: "2026-10-11",
  calories: 1200,
  calorieTarget: 2000,
  caloriePercent: 60,
  calorieGoalComplete: false,
  waterConsumedMl: 1500,
  waterTargetMl: 3000,
  waterPercent: 50,
  waterGoalComplete: false,
  message: {
    text: "Keep hydrating.",
    messageKey: "priority:hydrate",
    showCalorieComplete: false,
    showWaterComplete: false,
    patchCelebratedCalorieDateKey: null,
    patchCelebratedWaterDateKey: null,
    patchGreetingDateKey: null,
    patchGreetingMessageKey: null,
    patchRecentMessageKeys: ["priority:hydrate"],
  },
  weekDays: [],
  visitsThisWeek: 0,
  showWeeklyWorkoutProgress: false,
};

const suggestion = {
  kind: "suggested" as const,
  dayId: "d1",
  label: "Push",
  exerciseCount: 5,
  estimatedMinutes: 40,
};

describe("computeLiveDashboardMessageText", () => {
  it("shows hydration copy before the water goal is reached", () => {
    const text = computeLiveDashboardMessageText(
      baseDashboard,
      { consumedMl: 1500, percent: 50, goalComplete: false },
      "m1",
      "Alex",
      suggestion,
    );
    expect(text.toLowerCase()).toContain("hydrat");
  });

  it("updates to water-goal copy when live progress completes", () => {
    const text = computeLiveDashboardMessageText(
      baseDashboard,
      { consumedMl: 3000, percent: 100, goalComplete: true },
      "m1",
      "Alex",
      suggestion,
    );
    expect(text.toLowerCase()).toMatch(/water goal|hydration target/);
  });
});
