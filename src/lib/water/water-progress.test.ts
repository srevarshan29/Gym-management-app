import { describe, expect, it } from "vitest";

import {
  formatWaterLiters,
  sumWaterLogMl,
  waterDayProgress,
} from "@/lib/water/water-progress";

describe("waterDayProgress", () => {
  it("computes percent from consumed and target", () => {
    const result = waterDayProgress(1500, 3000);
    expect(result.percent).toBe(50);
    expect(result.goalComplete).toBe(false);
  });

  it("marks complete at or above target", () => {
    expect(waterDayProgress(3000, 3000).goalComplete).toBe(true);
    expect(waterDayProgress(3200, 3000).goalComplete).toBe(true);
  });
});

describe("sumWaterLogMl", () => {
  it("sums valid entries", () => {
    expect(
      sumWaterLogMl([{ amountMl: 250 }, { amountMl: 500 }]),
    ).toBe(750);
  });
});

describe("formatWaterLiters", () => {
  it("formats liters for large values", () => {
    expect(formatWaterLiters(1500)).toBe("1.5 L");
  });
});
