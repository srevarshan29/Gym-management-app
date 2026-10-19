import { describe, expect, it } from "vitest";

function averageVisitsPerWeek(
  visitCount: number,
  year: number,
  monthIndex0: number,
  todayKey: string,
): number {
  const start = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const end = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);
  const isCurrentMonth =
    todayYear === year && todayMonth - 1 === monthIndex0;
  const elapsedDaysInMonth = isCurrentMonth
    ? Math.max(1, todayDay)
    : lastDay;
  const elapsedWeeks = Math.max(1, elapsedDaysInMonth / 7);
  return visitCount === 0
    ? 0
    : Math.round((visitCount / elapsedWeeks) * 100) / 100;
}

describe("monthly attendance average", () => {
  it("uses elapsed days in current month", () => {
    const avg = averageVisitsPerWeek(4, 2026, 9, "2026-10-12");
    expect(avg).toBeCloseTo(2.33, 2);
  });

  it("avoids division by zero on first day of month", () => {
    const avg = averageVisitsPerWeek(0, 2026, 9, "2026-10-01");
    expect(avg).toBe(0);
  });
});
