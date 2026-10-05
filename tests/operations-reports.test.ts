import { describe, expect, it } from "vitest";

import { attendanceDateKey, ATTENDANCE_GYM_TIMEZONE } from "@/lib/attendance/date-key";
import type { AttendanceListItem } from "@/lib/attendance/types";
import { assertTenantAccess } from "@/lib/firestore/context";
import {
  formatReportDateRangeLabel,
  resolveCustomRange,
  resolveLast3MonthsRange,
  resolveLastMonthRange,
  validateCustomDateRange,
} from "@/lib/operations-reports/date-range";
import {
  computeAttendanceSummary,
  computeMemberReportMetrics,
  computePaymentReportMetrics,
} from "@/lib/operations-reports/metrics";
import {
  ATTENDANCE_CSV_HEADERS,
  buildNewMemberRows,
  MEMBERS_CSV_HEADERS,
  PAYMENTS_CSV_HEADERS,
} from "@/lib/operations-reports/queries";
import { csvHeaderLine } from "@/lib/csv";
import { platformContext } from "@/lib/firestore/helpers";

describe("operations report date ranges", () => {
  const now = new Date("2026-10-05T10:00:00.000Z");

  it("resolves last month to the previous complete calendar month", () => {
    const range = resolveLastMonthRange(now, ATTENDANCE_GYM_TIMEZONE);
    expect(range.startDateKey).toBe("2026-09-01");
    expect(range.endDateKey).toBe("2026-09-30");
    expect(formatReportDateRangeLabel(range)).toContain("Sep");
  });

  it("resolves last 3 months to three complete calendar months", () => {
    const range = resolveLast3MonthsRange(now, ATTENDANCE_GYM_TIMEZONE);
    expect(range.startDateKey).toBe("2026-07-01");
    expect(range.endDateKey).toBe("2026-09-30");
  });

  it("validates custom date ranges", () => {
    expect(validateCustomDateRange("", "2026-01-02").ok).toBe(false);
    expect(validateCustomDateRange("2026-01-02", "").ok).toBe(false);
    expect(validateCustomDateRange("2026-02-01", "2026-01-01").ok).toBe(false);
    expect(validateCustomDateRange("2026-01-01", "2026-01-31").ok).toBe(true);
  });

  it("uses half-open instants for timestamp queries", () => {
    const range = resolveCustomRange("2026-09-01", "2026-09-30");
    expect(range.startInstant.getTime()).toBeLessThan(range.endInstant.getTime());
    expect(range.asOfInstant.getTime()).toBeLessThan(range.endInstant.getTime());
  });
});

describe("attendance report metrics", () => {
  it("includes multiple check-ins from the same member on the same day", () => {
    const day = attendanceDateKey(new Date("2026-09-10T08:00:00Z"));
    const rows: AttendanceListItem[] = [
      {
        id: "a1",
        memberId: "m1",
        memberNumber: 1,
        memberName: "Alex",
        checkedInAt: new Date("2026-09-10T08:00:00Z"),
        method: "manual",
        dateKey: day,
      },
      {
        id: "a2",
        memberId: "m1",
        memberNumber: 1,
        memberName: "Alex",
        checkedInAt: new Date("2026-09-10T18:00:00Z"),
        method: "qr",
        dateKey: day,
      },
    ];
    const summary = computeAttendanceSummary(rows);
    expect(summary.totalCheckIns).toBe(2);
    expect(summary.uniqueMembers).toBe(1);
    expect(summary.averageCheckInsPerActiveMember).toBe(2);
  });
});

describe("member and payment report metrics", () => {
  const range = resolveCustomRange("2026-09-01", "2026-09-30");

  it("filters member metrics by date range", () => {
    const metrics = computeMemberReportMetrics(
      [
        {
          id: "m1",
          memberNumber: 1,
          name: "New",
          createdAt: new Date("2026-08-01"),
          endDate: new Date("2026-12-01"),
        },
        {
          id: "m2",
          memberNumber: 2,
          name: "Old",
          createdAt: new Date("2026-01-01"),
          endDate: new Date("2026-08-15"),
        },
      ],
      [
        {
          id: "s1",
          memberId: "m1",
          memberName: "New",
          memberNumber: 1,
          packageName: "Gold",
          startDate: new Date("2026-09-05"),
          endDate: new Date("2026-10-05"),
          createdAt: new Date("2026-09-05"),
        },
        {
          id: "s0",
          memberId: "m2",
          memberName: "Old",
          memberNumber: 2,
          packageName: "Silver",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-08-15"),
          createdAt: new Date("2026-01-01"),
        },
        {
          id: "s2",
          memberId: "m2",
          memberName: "Old",
          memberNumber: 2,
          packageName: "Silver",
          startDate: new Date("2026-09-10"),
          endDate: new Date("2026-10-10"),
          createdAt: new Date("2026-09-10"),
        },
      ],
      range,
    );

    expect(metrics.newMembers).toBe(1);
    expect(metrics.renewalsDuringPeriod).toBe(1);
    expect(metrics.expiringDuringPeriod).toBe(0);
  });

  it("totals only actual payments and excludes pending dues", () => {
    const metrics = computePaymentReportMetrics([
      { amount: 1000, method: "CASH" },
      { amount: 500, method: "UPI" },
    ]);
    expect(metrics.totalCollected).toBe(1500);
    expect(metrics.paymentCount).toBe(2);
    expect(metrics.averagePayment).toBe(750);
  });
});

describe("CSV export headers", () => {
  it("includes expected attendance and payment columns", () => {
    expect(ATTENDANCE_CSV_HEADERS).toEqual([
      "Date",
      "Member Number",
      "Member Name",
      "Check-in Time",
      "Method",
    ]);
    expect(PAYMENTS_CSV_HEADERS).toContain("Receipt Number");
    expect(csvHeaderLine([...MEMBERS_CSV_HEADERS])).toContain("Registered");
  });
});

describe("empty range messaging helpers", () => {
  it("buildNewMemberRows returns empty for ranges with no signups", () => {
    const range = resolveCustomRange("2026-01-01", "2026-01-31");
    const rows = buildNewMemberRows(
      [
        {
          id: "m1",
          memberNumber: 1,
          name: "Member",
          createdAt: new Date("2025-12-01"),
          endDate: new Date("2026-06-01"),
        },
      ],
      [
        {
          id: "s1",
          memberId: "m1",
          memberName: "Member",
          memberNumber: 1,
          packageName: "Gold",
          startDate: new Date("2025-12-01"),
          endDate: new Date("2026-06-01"),
          createdAt: new Date("2025-12-01"),
        },
      ],
      range,
      new Map(),
    );
    expect(rows).toEqual([]);
  });
});

describe("gym scoping", () => {
  it("denies cross-gym repository access for attendance range queries", () => {
    const staffCtx = {
      kind: "staff" as const,
      gymId: "gym-a",
      userId: "u1",
      role: "OWNER" as const,
    };
    expect(() => assertTenantAccess(staffCtx, "gym-b")).toThrow(
      /Tenant isolation violation/,
    );
    expect(() => assertTenantAccess(staffCtx, "gym-a")).not.toThrow();
  });

  it("uses platform context for server-side report loaders", () => {
    expect(platformContext.kind).toBe("platform");
  });
});

describe("subscription report date filtering", () => {
  it("counts new subscriptions created in range separately from renewals", () => {
    const range = resolveCustomRange("2026-09-01", "2026-09-30");
    const metrics = computeMemberReportMetrics(
      [
        {
          id: "m1",
          memberNumber: 1,
          name: "A",
          createdAt: new Date("2026-09-01"),
          endDate: new Date("2026-12-01"),
        },
      ],
      [
        {
          id: "s1",
          memberId: "m1",
          memberName: "A",
          memberNumber: 1,
          packageName: "Gold",
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-12-01"),
          createdAt: new Date("2026-09-01"),
        },
      ],
      range,
    );
    expect(metrics.newMembers).toBe(1);
    expect(metrics.renewalsDuringPeriod).toBe(0);
  });
});

describe("attendance repository gym scoping", () => {
  it("rejects another gym in countForDateKeyRange", async () => {
    const { AttendanceRepository } = await import(
      "@/lib/firestore/repositories/attendance"
    );
    const repo = new AttendanceRepository({} as never);
    const staffCtx = {
      kind: "staff" as const,
      gymId: "gym-a",
      userId: "u1",
      role: "OWNER" as const,
    };
    await expect(
      repo.countForDateKeyRange(staffCtx, "gym-b", "2026-01-01", "2026-01-31"),
    ).rejects.toThrow(/Tenant isolation violation/);
  });
});
