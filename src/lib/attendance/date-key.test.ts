import { describe, expect, it } from "vitest";

import {
  shiftAttendanceDateKey,
  startOfWeekDateKey,
  weekdayMon0FromDateKey,
} from "@/lib/attendance/date-key";

describe("attendance date key week helpers", () => {
  it("Monday is 0 for a known Monday", () => {
    expect(weekdayMon0FromDateKey("2026-10-12")).toBe(0);
  });

  it("startOfWeekDateKey returns Monday", () => {
    expect(startOfWeekDateKey("2026-10-15")).toBe("2026-10-12");
  });

  it("shiftAttendanceDateKey moves by days", () => {
    expect(shiftAttendanceDateKey("2026-10-11", 1)).toBe("2026-10-12");
  });
});
