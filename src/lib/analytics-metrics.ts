import { getRepositories, platformContext } from "@/lib/firestore";
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

/**
 * New member signups per calendar month for the last N months.
 * Uses each member's earliest subscription startDate (not Member.createdAt).
 * Months with no signups return joins: 0.
 */
export async function getMonthlyMemberJoins(
  tenantGymId: string,
  monthCount = ANALYTICS_MONTH_COUNT,
): Promise<MonthlyMemberJoinPoint[]> {
  const { subscriptions } = getRepositories();
  const now = new Date();
  const startMonth = chartStartMonth(monthCount, now);
  const earliestStarts = await subscriptions.listEarliestJoinStartsSince(
    platformContext,
    tenantGymId,
    startMonth,
  );
  return buildMonthlyMemberJoinsFromEarliestStarts(
    earliestStarts,
    monthCount,
    now,
  );
}

export async function getAnalyticsPageData(
  tenantGymId: string,
): Promise<AnalyticsPageData> {
  const { gyms, members, payments, subscriptions, visitors } = getRepositories();
  const ctx = platformContext;
  const now = new Date();
  const { startThisMonth, startNextMonth } = monthBounds(now);
  const startMonth = chartStartMonth(ANALYTICS_MONTH_COUNT, now);

  const gym = await gyms.getById(ctx, tenantGymId);
  const pendingWalkIns =
    gym?.dashboardCounters?.pendingWalkInVisitors ??
    (await visitors.countByGym(ctx, tenantGymId, {
      status: "pending",
      source: "walk_in",
    }));

  const [
    totalMembers,
    paymentsLoggedThisMonth,
    earliestStarts,
    paymentRows,
  ] = await Promise.all([
    members.countByGym(ctx, tenantGymId),
    payments.countPaidInRange(ctx, tenantGymId, startThisMonth, startNextMonth),
    subscriptions.listEarliestJoinStartsSince(ctx, tenantGymId, startMonth),
    payments.listSince(ctx, tenantGymId, startMonth),
  ]);

  const memberJoins = buildMonthlyMemberJoinsFromEarliestStarts(
    earliestStarts,
    ANALYTICS_MONTH_COUNT,
    now,
  );
  const revenueTrend = buildMonthlyRevenueTrendFromPayments(
    paymentRows.map((p) => ({ amount: p.amount, paidAt: p.paidAt.toDate() })),
    ANALYTICS_MONTH_COUNT,
    now,
  );

  const totalRevenue = revenueTrend.reduce((sum, point) => sum + point.revenue, 0);
  const avgRevenuePerMonth = totalRevenue / ANALYTICS_MONTH_COUNT;

  return {
    totalMembers,
    paymentsLoggedThisMonth,
    visitorsCount: pendingWalkIns,
    avgRevenuePerMonth,
    memberJoins,
    revenueTrend,
  };
}
