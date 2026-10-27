import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("member dashboard goal customization UI", () => {
  it("uses soft water blue for quick-add float text only", () => {
    const source = readFileSync(
      resolve("src/components/member-portal/dashboard/member-dashboard-metric-cards.tsx"),
      "utf8",
    );
    expect(source).toContain("MEMBER_WATER_ACCENT");
    expect(source).toMatch(
      /animate-dashboard-water-float[\s\S]*?style=\{\{\s*color:\s*MEMBER_WATER_ACCENT/,
    );
  });

  it("adds edit affordances without changing bottom navigation", () => {
    const metrics = readFileSync(
      resolve("src/components/member-portal/dashboard/member-dashboard-metric-cards.tsx"),
      "utf8",
    );
    const attendance = readFileSync(
      resolve("src/components/member-portal/dashboard/member-dashboard-attendance.tsx"),
      "utf8",
    );
    const waterDialog = readFileSync(
      resolve("src/components/member-portal/dashboard/water-goal-edit-dialog.tsx"),
      "utf8",
    );
    const waterGlass = readFileSync(
      resolve("src/components/member-portal/dashboard/water-goal-glass-visual.tsx"),
      "utf8",
    );
    const weeklyRing = readFileSync(
      resolve("src/components/member-portal/dashboard/weekly-activity-ring-visual.tsx"),
      "utf8",
    );
    expect(waterDialog).toContain("targetMl={draftMl}");
    expect(waterGlass).toContain("targetMl");
    expect(waterGlass).toContain("MEMBER_DAILY_WATER_TARGET_MIN_ML");
    expect(weeklyRing).toContain("DAYS / WEEK");
    expect(weeklyRing).toMatch(/day <= safeTarget/);
    expect(waterDialog).toContain("MEMBER_DAILY_WATER_TARGET_SLIDER_STEP_ML");
    expect(waterDialog).not.toContain("250 ml");
    expect(waterDialog).not.toContain("PRESETS_ML");
    expect(metrics).toContain("WaterGoalEditDialog");
    expect(metrics).toContain("Edit daily water goal");
    expect(attendance).toContain("WeeklyAttendanceGoalEditDialog");
    expect(attendance).toContain("Edit weekly gym goal");
    expect(attendance).toContain("returnFocusRef={weeklyGoalEditRef}");
    expect(metrics).toContain("returnFocusRef={waterGoalEditRef}");
    expect(waterDialog).toContain("initialFocusRef={sliderRef}");
    expect(waterDialog).toContain('presentation="water"');
    expect(waterDialog).toContain("Stay hydrated");
    expect(waterDialog).toContain("litres / day");
    const weeklyDialog = readFileSync(
      resolve(
        "src/components/member-portal/dashboard/weekly-attendance-goal-edit-dialog.tsx",
      ),
      "utf8",
    );
    expect(weeklyDialog).toContain('presentation="weekly"');
    expect(weeklyDialog).toContain("Build your routine");
    expect(weeklyDialog).toContain("Build a routine that suits your week.");
    expect(weeklyDialog).toContain("grid-cols-7");
    expect(weeklyDialog).not.toContain("One day");
  });
});
