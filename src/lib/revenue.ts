import { withTenant } from "@/lib/db-context";

export type MonthlyRevenuePoint = {
  monthKey: string;
  monthLabel: string;
  monthTooltip: string;
  revenue: number;
};

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
 * Month keys use the Node process timezone so they match Date#getMonth().
 */
export async function getMonthlyRevenueTrend(
  tenantGymId: string,
  monthCount = 6,
): Promise<MonthlyRevenuePoint[]> {
  return withTenant(tenantGymId, async (tx) => {
    const now = new Date();
    const startMonth = new Date(
      now.getFullYear(),
      now.getMonth() - (monthCount - 1),
      1,
    );
    const nodeTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const grouped = await tx.$queryRaw<{ month_key: string; revenue: number }[]>`
      SELECT to_char("paidAt" AT TIME ZONE ${nodeTz}, 'YYYY-MM') AS month_key,
             SUM(amount)::float AS revenue
      FROM "Payment"
      WHERE "gymId" = ${tenantGymId}
        AND "paidAt" >= ${startMonth}
      GROUP BY 1
    `;

    const buckets = buildMonthlyRevenueBuckets(monthCount, now);
    const indexByKey = new Map(buckets.map((b, i) => [b.monthKey, i]));
    for (const row of grouped) {
      const idx = indexByKey.get(row.month_key);
      if (idx !== undefined) {
        buckets[idx].revenue += Number(row.revenue);
      }
    }
    return buckets;
  });
}
