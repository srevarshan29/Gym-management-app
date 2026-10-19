import { describe, expect, it } from "vitest";

import {
  buildWeeklyPaymentCountsFromPayments,
  computeDashboardStatusCounts,
  statusCutoffs,
  type WeekBucket,
} from "@/lib/dashboard-queries";
import {
  memberDocMatchesQueryTokens,
  sliceMemberSearchMatches,
} from "@/lib/firestore/member-search";
import type { MemberListItem } from "@/lib/queries";
import {
  applyMonthlyRevenueSums,
  buildMonthlyRevenueBuckets,
  buildMonthlyRevenueTrendFromPayments,
  monthRangeHalfOpen,
} from "@/lib/revenue";
import { statusFromEndDate } from "@/lib/subscription";

function member(
  overrides: Partial<MemberListItem> & Pick<MemberListItem, "id">,
): MemberListItem {
  return {
    memberNumber: 1,
    name: "Test",
    phone: "999",
    email: null,
    photoUrl: null,
    gender: "MALE",
    createdAt: new Date("2026-01-01"),
    packageName: "Monthly",
    currentSubscriptionId: null,
    startDate: null,
    endDate: null,
    status: "NONE",
    subsAmount: null,
    paidAmount: null,
    pendingAmount: 0,
    addedByName: null,
    isPt: false,
    trainerId: null,
    trainerName: null,
    ...overrides,
  };
}

describe("dashboard member roster accuracy", () => {
  const now = new Date("2026-09-14T12:00:00");
  const cutoffs = statusCutoffs(now);

  it("counts status for more than 500 members when full roster is provided", () => {
    const activeEnd = new Date(now);
    activeEnd.setDate(activeEnd.getDate() + 20);

    const all: MemberListItem[] = [];
    for (let i = 0; i < 501; i++) {
      all.push(
        member({
          id: `m-${i}`,
          endDate: i === 0 ? null : activeEnd,
          status: i === 0 ? "NONE" : statusFromEndDate(activeEnd, now),
        }),
      );
    }

    const result = computeDashboardStatusCounts(501, all, cutoffs);
    expect(result.totalMembers).toBe(501);
    expect(result.activeOrExpiringCount).toBe(500);
  });
});

describe("weekly payment count parity", () => {
  it("matches per-bucket counts from payment timestamps", () => {
    const buckets: WeekBucket[] = [
      {
        start: new Date("2026-09-01T00:00:00"),
        end: new Date("2026-09-07T23:59:59.999"),
      },
      {
        start: new Date("2026-09-08T00:00:00"),
        end: new Date("2026-09-14T23:59:59.999"),
      },
    ];
    const paidAtDates = [
      new Date("2026-09-02T10:00:00"),
      new Date("2026-09-02T18:00:00"),
      new Date("2026-09-10T09:00:00"),
    ];

    const fromPayments = buildWeeklyPaymentCountsFromPayments(paidAtDates, buckets);
    const fromCounts = buckets.map((bucket) => {
      const endExclusive = new Date(bucket.end.getTime() + 1);
      return paidAtDates.filter(
        (paidAt) => paidAt >= bucket.start && paidAt < endExclusive,
      ).length;
    });

    expect(fromCounts).toEqual(fromPayments);
  });
});

describe("monthly revenue aggregates", () => {
  it("matches payment-row aggregation for calendar months", () => {
    const now = new Date("2026-09-15T12:00:00");
    const monthCount = 3;
    const payments = [
      { amount: 1000, paidAt: new Date("2026-07-05") },
      { amount: 500, paidAt: new Date("2026-08-10") },
      { amount: 250, paidAt: new Date("2026-08-20") },
    ];

    const fromRows = buildMonthlyRevenueTrendFromPayments(
      payments,
      monthCount,
      now,
    );
    const sums = new Map<string, number>();
    for (const bucket of buildMonthlyRevenueBuckets(monthCount, now)) {
      const [year, month] = bucket.monthKey.split("-").map(Number);
      const { start, end } = monthRangeHalfOpen(new Date(year, month - 1, 1));
      const sum = payments
        .filter((p) => p.paidAt >= start && p.paidAt < end)
        .reduce((acc, p) => acc + p.amount, 0);
      sums.set(bucket.monthKey, sum);
    }
    const fromAggregates = applyMonthlyRevenueSums(
      buildMonthlyRevenueBuckets(monthCount, now),
      sums,
    );

    expect(fromAggregates).toEqual(fromRows);
  });
});

describe("member directory search helpers", () => {
  it("matches multi-token queries against searchTokens", () => {
    const tokens = ["alex", "9876"];
    const docTokens = ["alex", "johnson", "9876543210"];
    expect(memberDocMatchesQueryTokens(docTokens, tokens)).toBe(true);
    expect(memberDocMatchesQueryTokens(docTokens, ["alex", "0000"])).toBe(false);
  });

  it("paginates sorted matches without changing total count", () => {
    const matches = Array.from({ length: 120 }, (_, i) => `m-${i}`);
    const page1 = sliceMemberSearchMatches(matches, 1, 50);
    const page3 = sliceMemberSearchMatches(matches, 3, 50);
    expect(page1.matchingCount).toBe(120);
    expect(page1.rows).toHaveLength(50);
    expect(page3.rows).toHaveLength(20);
  });
});
