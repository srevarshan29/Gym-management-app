import { describe, expect, it } from "vitest";

import { attendanceDateKey } from "@/lib/attendance/date-key";
import { defaultNutritionLogDate } from "@/lib/nutrition/date-utils";

describe("nutrition dashboard date alignment", () => {
  it("defaultNutritionLogDate matches attendanceDateKey for the same instant", () => {
    const instants = [
      new Date("2026-03-15T12:00:00Z"),
      new Date("2026-03-15T20:30:00Z"),
      new Date("2026-10-11T18:45:00+05:30"),
    ];
    for (const now of instants) {
      expect(defaultNutritionLogDate(now)).toBe(attendanceDateKey(now));
    }
  });
});
