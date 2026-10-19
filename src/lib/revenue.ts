import { getRepositories, platformContext } from "@/lib/firestore";
import { measureServerPhase } from "@/lib/server-perf";
import type { MonthlyRevenuePoint } from "@/lib/chart-types";

export type { MonthlyRevenuePoint } from "@/lib/chart-types";

export type RevenuePaymentRow = {
  amount: { toString(): string } | number;
  paidAt: Date;
};

/** First calendar day of the oldest month included in the revenue trend. */
export function revenueTrendRangeStart(
  monthCount: number,
  now = new Date(),
): Date {
  return new Date(now.getFullYear(), now.getMonth() - (monthCount - 1), 1);
}

export function buildMonthlyRevenueBuckets(
  monthCount: number,
  now = new Date(),
): MonthlyRevenuePoint[] {
  const buckets: MonthlyRevenuePoint[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      monthLabel: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(d),
      monthTooltip: new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
      }).format(d),
      revenue: 0,
    });
  }
  return buckets;
}

/** Pure aggregation: bucket payment rows into calendar months (last N months from `now`). */
export function buildMonthlyRevenueTrendFromPayments(
  payments: RevenuePaymentRow[],
  monthCount: number,
  now = new Date(),
): MonthlyRevenuePoint[] {
  const buckets = buildMonthlyRevenueBuckets(monthCount, now);
  const indexByKey = new Map(buckets.map((b, i) => [b.monthKey, i]));

  for (const payment of payments) {
    const d = new Date(payment.paidAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const idx = indexByKey.get(key);
    if (idx !== undefined) {
      buckets[idx].revenue += Number(payment.amount);
    }
  }

  return buckets;
}

/**
 * Loads all gym payments since the revenue-trend window start (one Firestore query).
 */
export async function loadPaymentsSinceRevenueTrendStart(
  tenantGymId: string,
  monthCount = 6,
  now = new Date(),
): Promise<RevenuePaymentRow[]> {
  return measureServerPhase("staff.dashboard.revenuePayments", async () => {
    const { payments } = getRepositories();
    const startMonth = revenueTrendRangeStart(monthCount, now);
    const rows = await payments.listSince(
      platformContext,
      tenantGymId,
      startMonth,
    );
    return rows.map((p) => ({
      amount: p.amount,
      paidAt: p.paidAt.toDate(),
    }));
  });
}

/**
 * Sum of Payment.amount per calendar month for the last N months,
 * scoped to a single gym. Months with no payments return revenue 0.
 */
export function monthRangeHalfOpen(monthDate: Date): { start: Date; end: Date } {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
  return { start, end };
}

/** Applies pre-fetched monthly sums to chart buckets (pure, testable). */
export function applyMonthlyRevenueSums(
  buckets: MonthlyRevenuePoint[],
  sumsByMonthKey: Map<string, number>,
): MonthlyRevenuePoint[] {
  return buckets.map((bucket) => ({
    ...bucket,
    revenue: sumsByMonthKey.get(bucket.monthKey) ?? 0,
  }));
}

export async function loadMonthlyRevenueSums(
  tenantGymId: string,
  monthCount = 6,
  now = new Date(),
): Promise<Map<string, number>> {
  return measureServerPhase("staff.revenue.monthlySums", async () => {
    const { payments } = getRepositories();
    const buckets = buildMonthlyRevenueBuckets(monthCount, now);
    const entries = await Promise.all(
      buckets.map(async (bucket) => {
        const [year, month] = bucket.monthKey.split("-").map(Number);
        const { start, end } = monthRangeHalfOpen(
          new Date(year, month - 1, 1),
        );
        const sum = await payments.sumPaidInRange(
          platformContext,
          tenantGymId,
          start,
          end,
        );
        return [bucket.monthKey, sum] as const;
      }),
    );
    return new Map(entries);
  });
}

export async function getMonthlyRevenueTrend(
  tenantGymId: string,
  monthCount = 6,
): Promise<MonthlyRevenuePoint[]> {
  const now = new Date();
  const buckets = buildMonthlyRevenueBuckets(monthCount, now);
  const sums = await loadMonthlyRevenueSums(tenantGymId, monthCount, now);
  return applyMonthlyRevenueSums(buckets, sums);
}
