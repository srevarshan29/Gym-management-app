import { withTenant } from "@/lib/db-context";
import type { MembershipRenewalRow } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";
import {
  queryAllCyclePendingTotals,
  queryCurrentCycleCollection,
  queryDashboardStatusCounts,
  queryExpiredMembershipPreview,
  queryMemberSparklines,
  queryPackageDistribution,
  queryUpcomingRenewalPreview,
  queryWeeklyPaymentCounts,
  statusCutoffs,
  type WeekBucket,
} from "@/lib/dashboard-queries";

export type PackageDistributionPoint = {
  name: string;
  count: number;
};

export type DashboardSparklines = {
  activeMembers: number[];
  newMembers: number[];
  expiringSoon: number[];
  expired: number[];
};

export type FinancialSparklines = {
  revenue: number[];
  collectionRate: number[];
  pending: number[];
};

export type DashboardMetrics = {
  totalMembers: number;
  activeCount: number;
  activeMembersTrendLabel: string | undefined;
  expiringSoonCount: number;
  expiredCount: number;
  upcomingPreview: MembershipRenewalRow[];
  expiredPreview: MembershipRenewalRow[];
  newMembersThisMonth: number;
  newMembersLastMonth: number;
  newMembersHint: string;
  newMembersTrendLabel: string | undefined;
  collectionRatePercent: number;
  collectionCollected: number;
  collectionExpected: number;
  collectionHint: string;
  pendingTotal: number;
  pendingMemberCount: number;
  pendingHint: string;
  packageDistribution: PackageDistributionPoint[];
  sparklines: DashboardSparklines;
};

const SPARKLINE_WEEKS = 6;

function lastNWeekBuckets(count: number, reference = new Date()): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const end = new Date(reference);
    end.setDate(end.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    buckets.push({ start, end });
  }
  return buckets;
}

function monthBounds(reference: Date) {
  const startThisMonth = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const startLastMonth = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  return { startThisMonth, startLastMonth };
}

function formatNewMembersHint(thisMonth: number, lastMonth: number): string {
  if (thisMonth === 0) return "No new members this month";
  return `+${thisMonth} this month`;
}

/** Percent change trend label for KPI cards (e.g. "↑ 8% from last month"). */
export function formatTrendLabel(
  current: number,
  previous: number,
  periodLabel = "last month",
): string | undefined {
  if (current === 0 && previous === 0) return undefined;
  if (previous === 0) {
    return current > 0 ? `↑ new vs ${periodLabel}` : undefined;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return `→ same as ${periodLabel}`;
  const arrow = pct > 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(pct)}% from ${periodLabel}`;
}

function sparklineTrendLabel(
  values: number[],
  periodLabel = "last week",
): string | undefined {
  if (values.length < 2) return undefined;
  return formatTrendLabel(values[values.length - 1], values[values.length - 2], periodLabel);
}

/** Visual trend series for financial KPI cards (approximate for pending). */
export async function getFinancialSparklines(
  tenantGymId: string,
  collectionExpected: number,
  pendingTotal: number,
  monthlyRevenue: number[],
  monthCount = 6,
): Promise<FinancialSparklines> {
  const weekBuckets = lastNWeekBuckets(SPARKLINE_WEEKS);

  const weeklyPaymentCounts = await withTenant(tenantGymId, (tx) =>
    queryWeeklyPaymentCounts(tx, tenantGymId, weekBuckets),
  );

  const revenue =
    monthlyRevenue.length > 0
      ? monthlyRevenue
      : Array.from({ length: monthCount }, () => 0);

  const monthlyExpected =
    collectionExpected > 0 ? collectionExpected / monthCount : 0;

  const collectionRate = revenue.map((paid) =>
    monthlyExpected > 0
      ? Math.min(100, Math.round((paid / monthlyExpected) * 100))
      : paid > 0
        ? 100
        : 0,
  );

  const maxWeekly = Math.max(...weeklyPaymentCounts, 1);
  const pending = weeklyPaymentCounts.map((count) => {
    const factor = 0.55 + 0.45 * (1 - count / maxWeekly);
    return Math.round(pendingTotal * factor);
  });

  return { revenue, collectionRate, pending };
}

export async function getDashboardMetrics(
  tenantGymId: string,
): Promise<DashboardMetrics> {
  const now = new Date();
  const { startThisMonth, startLastMonth } = monthBounds(now);
  const cutoffs = statusCutoffs(now);
  const weekBuckets = lastNWeekBuckets(SPARKLINE_WEEKS, now);

  const {
    status,
    pending,
    collection,
    packageDistribution,
    upcomingPreview,
    expiredPreview,
    sparkRows,
    newMembersThisMonth,
    newMembersLastMonth,
  } = await withTenant(tenantGymId, async (tx) => {
    const [
      statusCounts,
      pendingTotals,
      collectionTotals,
      packages,
      upcoming,
      expired,
      sparks,
      thisMonth,
      lastMonth,
    ] = await Promise.all([
      queryDashboardStatusCounts(tx, tenantGymId, cutoffs),
      queryAllCyclePendingTotals(tx, tenantGymId),
      queryCurrentCycleCollection(tx, tenantGymId),
      queryPackageDistribution(tx, tenantGymId, cutoffs),
      queryUpcomingRenewalPreview(tx, tenantGymId, cutoffs),
      queryExpiredMembershipPreview(tx, tenantGymId, cutoffs),
      queryMemberSparklines(tx, tenantGymId, weekBuckets, now),
      tx.member.count({
        where: { gymId: tenantGymId, createdAt: { gte: startThisMonth } },
      }),
      tx.member.count({
        where: {
          gymId: tenantGymId,
          createdAt: { gte: startLastMonth, lt: startThisMonth },
        },
      }),
    ]);
    return {
      status: statusCounts,
      pending: pendingTotals,
      collection: collectionTotals,
      packageDistribution: packages,
      upcomingPreview: upcoming,
      expiredPreview: expired,
      sparkRows: sparks,
      newMembersThisMonth: thisMonth,
      newMembersLastMonth: lastMonth,
    };
  });

  const collectionRatePercent =
    collection.collectionExpected > 0
      ? Math.round(
          (collection.collectionCollected / collection.collectionExpected) * 100,
        )
      : 100;

  const sparklines: DashboardSparklines = {
    newMembers: sparkRows.map((r) => r.newCount),
    activeMembers: sparkRows.map((r) => r.activeCount),
    expiringSoon: sparkRows.map((r) => r.expiringCount),
    expired: sparkRows.map((r) => r.expiredCount),
  };

  return {
    totalMembers: status.totalMembers,
    activeCount: status.activeOrExpiringCount,
    activeMembersTrendLabel: sparklineTrendLabel(sparklines.activeMembers),
    expiringSoonCount: status.expiringSoonCount,
    expiredCount: status.expiredCount,
    upcomingPreview,
    expiredPreview,
    newMembersThisMonth,
    newMembersLastMonth,
    newMembersHint: formatNewMembersHint(newMembersThisMonth, newMembersLastMonth),
    newMembersTrendLabel: formatTrendLabel(
      newMembersThisMonth,
      newMembersLastMonth,
    ),
    collectionRatePercent,
    collectionCollected: collection.collectionCollected,
    collectionExpected: collection.collectionExpected,
    collectionHint: `${formatCurrency(collection.collectionCollected)} / ${formatCurrency(collection.collectionExpected)} expected`,
    pendingTotal: pending.pendingTotal,
    pendingMemberCount: pending.pendingMemberCount,
    pendingHint: `${formatCurrency(pending.pendingTotal)} • ${pending.pendingMemberCount} member${pending.pendingMemberCount === 1 ? "" : "s"}`,
    packageDistribution,
    sparklines,
  };
}
