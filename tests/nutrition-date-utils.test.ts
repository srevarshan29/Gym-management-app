import { describe, expect, it } from "vitest";

import {
  defaultNutritionLogDate,
  formatNutritionInsightsLabel,
  parseNutritionLogDate,
  shiftNutritionLogDate,
} from "@/lib/nutrition/date-utils";

describe("nutrition date utils", () => {
  it("parses and shifts log dates", () => {
    expect(parseNutritionLogDate("2026-03-15")).toBe("2026-03-15");
    expect(shiftNutritionLogDate("2026-03-15", -1)).toBe("2026-03-14");
  });

  it("labels today and yesterday", () => {
    const today = defaultNutritionLogDate(new Date("2026-03-15T12:00:00"));
    expect(today).toBe("2026-03-15");
    expect(formatNutritionInsightsLabel("2026-03-15", today)).toBe("Today");
    expect(formatNutritionInsightsLabel("2026-03-14", today)).toBe("Yesterday");
  });
});
