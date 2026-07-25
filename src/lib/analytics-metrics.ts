import { withTenant } from "@/lib/db-context";
import { getMonthlyRevenueTrend, type MonthlyRevenuePoint } from "@/lib/revenue";

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

/**
 * New member signups per calendar month for the last N months.
 * Months with no signups return joins: 0.
 */
export async function getMonthlyMemberJoins(
  gymId: string,
  monthCount = ANALYTICS_MONTH_COUNT,
): Promise<MonthlyMemberJoinPoint[]> {
  return withTenant(gymId, async (tx) => {
    const now = new Date();
    const startMonth = new Date(
      now.getFullYear(),
      now.getMonth() - (monthCount - 1),
      1,
    );

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

    const members = await tx.member.findMany({
      where: { gymId, createdAt: { gte: startMonth } },
      select: { createdAt: true },
    });

    const indexByKey = new Map(buckets.map((b, i) => [b.monthKey, i]));

    for (const member of members) {
      const d = new Date(member.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const idx = indexByKey.get(key);
      if (idx !== undefined) {
        buckets[idx].joins += 1;
      }
    }

    return buckets;
  });
}

export async function getAnalyticsPageData(gymId: string): Promise<AnalyticsPageData> {
  const now = new Date();
  const { startThisMonth, startNextMonth } = monthBounds(now);

  const [totalMembers, paymentsLoggedThisMonth, memberJoins, revenueTrend] =
    await Promise.all([
      withTenant(gymId, (tx) => tx.member.count({ where: { gymId } })),
      withTenant(gymId, (tx) =>
        tx.payment.count({
          where: {
            gymId,
            paidAt: { gte: startThisMonth, lt: startNextMonth },
          },
        }),
      ),
      getMonthlyMemberJoins(gymId, ANALYTICS_MONTH_COUNT),
      getMonthlyRevenueTrend(gymId, ANALYTICS_MONTH_COUNT),
    ]);

  const totalRevenue = revenueTrend.reduce((sum, point) => sum + point.revenue, 0);
  const avgRevenuePerMonth = totalRevenue / ANALYTICS_MONTH_COUNT;

  return {
    totalMembers,
    paymentsLoggedThisMonth,
    visitorsCount: 0,
    avgRevenuePerMonth,
    memberJoins,
    revenueTrend,
  };
}
