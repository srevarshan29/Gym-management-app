import type { Prisma } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import {
  buildMonthlyRevenueTrendFromPayments,
  type MonthlyRevenuePoint,
} from "@/lib/revenue";

export type MonthlyMemberJoinPoint = {
  monthKey: string;
  monthLabel: string;
  monthTooltip: string;
  joins: number;
};

export type AnalyticsPageData = {
  totalMembers: number;
  paymentsLoggedThisMonth: number;
  visitorsCount: number;
  avgRevenuePerMonth: number;
  memberJoins: MonthlyMemberJoinPoint[];
  revenueTrend: MonthlyRevenuePoint[];
};

const ANALYTICS_MONTH_COUNT = 12;

function monthBounds(reference: Date) {
  const startThisMonth = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const startNextMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  return { startThisMonth, startNextMonth };
}

function chartStartMonth(monthCount: number, now: Date) {
  return new Date(now.getFullYear(), now.getMonth() - (monthCount - 1), 1);
}

export function buildMonthlyMemberJoinBuckets(
  monthCount: number,
  now = new Date(),
): MonthlyMemberJoinPoint[] {
  const buckets: MonthlyMemberJoinPoint[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      monthLabel: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(d),
      monthTooltip: new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
      }).format(d),
      joins: 0,
    });
  }
  return buckets;
}

/** Bucket earliest subscription start dates (one per member) into chart months. */
export function buildMonthlyMemberJoinsFromEarliestStarts(
  earliestStartDates: Date[],
  monthCount: number,
  now = new Date(),
): MonthlyMemberJoinPoint[] {
  const startMonth = chartStartMonth(monthCount, now);
  const buckets = buildMonthlyMemberJoinBuckets(monthCount, now);
  const indexByKey = new Map(buckets.map((b, i) => [b.monthKey, i]));

  for (const startDate of earliestStartDates) {
    const d = new Date(startDate);
    if (d < startMonth) continue;

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const idx = indexByKey.get(key);
    if (idx !== undefined) {
      buckets[idx].joins += 1;
    }
  }

  return buckets;
}

async function fetchEarliestJoinStartsInWindow(
  tx: Prisma.TransactionClient,
  gymId: string,
  startMonth: Date,
): Promise<Date[]> {
  const groups = await tx.subscription.groupBy({
    by: ["memberId"],
    where: { gymId },
    _min: { startDate: true },
    having: {
      startDate: {
        _min: {
          gte: startMonth,
        },
      },
    },
  });

  return groups
    .map((g) => g._min.startDate)
    .filter((d): d is Date => d != null);
}

/**
 * New member signups per calendar month for the last N months.
 * Uses each member's earliest subscription startDate (not Member.createdAt).
 * Months with no signups return joins: 0.
 */
export async function getMonthlyMemberJoins(
  gymId: string,
  monthCount = ANALYTICS_MONTH_COUNT,
): Promise<MonthlyMemberJoinPoint[]> {
  return withTenant(gymId, async (tx) => {
    const now = new Date();
    const startMonth = chartStartMonth(monthCount, now);
    const earliestStarts = await fetchEarliestJoinStartsInWindow(
      tx,
      gymId,
      startMonth,
    );
    return buildMonthlyMemberJoinsFromEarliestStarts(
      earliestStarts,
      monthCount,
      now,
    );
  });
}

export async function getAnalyticsPageData(gymId: string): Promise<AnalyticsPageData> {
  return withTenant(gymId, async (tx) => {
    const now = new Date();
    const { startThisMonth, startNextMonth } = monthBounds(now);
    const startMonth = chartStartMonth(ANALYTICS_MONTH_COUNT, now);

    const [
      totalMembers,
      paymentsLoggedThisMonth,
      visitorsCount,
      earliestStarts,
      payments,
    ] = await Promise.all([
      tx.member.count({ where: { gymId } }),
      tx.payment.count({
        where: {
          gymId,
          paidAt: { gte: startThisMonth, lt: startNextMonth },
        },
      }),
      tx.visitor.count({
        where: { gymId, status: "pending", source: "walk_in" },
      }),
      fetchEarliestJoinStartsInWindow(tx, gymId, startMonth),
      tx.payment.findMany({
        where: { gymId, paidAt: { gte: startMonth } },
        select: { amount: true, paidAt: true },
      }),
    ]);

    const memberJoins = buildMonthlyMemberJoinsFromEarliestStarts(
      earliestStarts,
      ANALYTICS_MONTH_COUNT,
      now,
    );
    const revenueTrend = buildMonthlyRevenueTrendFromPayments(
      payments,
      ANALYTICS_MONTH_COUNT,
      now,
    );

    const totalRevenue = revenueTrend.reduce((sum, point) => sum + point.revenue, 0);
    const avgRevenuePerMonth = totalRevenue / ANALYTICS_MONTH_COUNT;

    return {
      totalMembers,
      paymentsLoggedThisMonth,
      visitorsCount,
      avgRevenuePerMonth,
      memberJoins,
      revenueTrend,
    };
  });
}
