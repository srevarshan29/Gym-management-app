import { getRepositories, platformContext } from "@/lib/firestore";
import type { MonthlyRevenuePoint } from "@/lib/chart-types";

export type { MonthlyRevenuePoint } from "@/lib/chart-types";

type RevenuePaymentRow = {
  amount: { toString(): string } | number;
  paidAt: Date;
};

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
 * Sum of Payment.amount per calendar month for the last N months,
 * scoped to a single gym. Months with no payments return revenue 0.
 */
export async function getMonthlyRevenueTrend(
  tenantGymId: string,
  monthCount = 6,
): Promise<MonthlyRevenuePoint[]> {
  const { payments } = getRepositories();
  const now = new Date();
  const startMonth = new Date(
    now.getFullYear(),
    now.getMonth() - (monthCount - 1),
    1,
  );

  const rows = await payments.listSince(
    platformContext,
    tenantGymId,
    startMonth,
  );

  return buildMonthlyRevenueTrendFromPayments(
    rows.map((p) => ({ amount: p.amount, paidAt: p.paidAt.toDate() })),
    monthCount,
    now,
  );
}
