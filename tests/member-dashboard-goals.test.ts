import { describe, expect, it } from "vitest";

import {
  adjustWaterTargetByButtonMl,
  clampWaterTargetDraftMl,
  parseMemberDailyWaterTargetMl,
  parseMemberWeeklyAttendanceTarget,
  resolveMemberDailyWaterTargetMl,
  resolveMemberWeeklyAttendanceTarget,
} from "@/lib/member-portal/member-dashboard-goals";
import { weeklyAttendanceDisplayProgress } from "@/lib/member-portal/weekly-attendance-display";
import { waterDayProgress } from "@/lib/water/water-progress";

describe("member dashboard goals", () => {
  it("parses and clamps daily water targets", () => {
    expect(parseMemberDailyWaterTargetMl(2750)).toBe(2750);
    expect(parseMemberDailyWaterTargetMl(2624)).toBe(2600);
    expect(parseMemberDailyWaterTargetMl(2625)).toBe(2650);
    expect(() => parseMemberDailyWaterTargetMl(100)).toThrow();
    expect(clampWaterTargetDraftMl(6123)).toBe(6000);
    expect(clampWaterTargetDraftMl(5925)).toBe(5950);
    expect(adjustWaterTargetByButtonMl(2000, 250)).toBe(2250);
    expect(adjustWaterTargetByButtonMl(5750, 250)).toBe(6000);
  });

  it("parses weekly attendance targets between 1 and 7", () => {
    expect(parseMemberWeeklyAttendanceTarget(4)).toBe(4);
    expect(() => parseMemberWeeklyAttendanceTarget(0)).toThrow();
    expect(() => parseMemberWeeklyAttendanceTarget(8)).toThrow();
  });

  it("falls back to defaults when stored goals are missing or invalid", () => {
    expect(resolveMemberDailyWaterTargetMl(null)).toBe(3000);
    expect(resolveMemberWeeklyAttendanceTarget(null)).toBe(5);
    expect(
      resolveMemberDailyWaterTargetMl({
        id: "x",
        gymId: "g",
        memberId: "m",
        greetingDateKey: null,
        greetingMessageKey: null,
        recentMessageKeys: [],
        celebratedCalorieDateKey: null,
        celebratedWaterDateKey: null,
        dailyWaterTargetMl: 99999,
        weeklyAttendanceTarget: null,
        updatedAt: {} as never,
      }),
    ).toBe(3000);
  });

  it("recalculates water progress when only the target changes", () => {
    const before = waterDayProgress(1500, 3000);
    const after = waterDayProgress(1500, 2000);
    expect(before.consumedMl).toBe(after.consumedMl);
    expect(after.percent).toBeGreaterThan(before.percent);
    expect(after.goalComplete).toBe(false);
  });

  it("uses attendance visit counts for weekly ring progress", () => {
    const progress = weeklyAttendanceDisplayProgress(2, 4);
    expect(progress.visits).toBe(2);
    expect(progress.benchmark).toBe(4);
    expect(progress.remaining).toBe(2);
    expect(progress.percent).toBe(50);
  });
});
