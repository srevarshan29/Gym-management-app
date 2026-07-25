import { withTenant } from "@/lib/db-context";
import { getMembersWithStatus, type MemberListItem } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

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
  expiringSoon: MemberListItem[];
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

type WeekBucket = { start: Date; end: Date };

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

function inRange(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function computeSparklines(
  members: MemberListItem[],
  reference = new Date(),
): DashboardSparklines {
  const buckets = lastNWeekBuckets(SPARKLINE_WEEKS, reference);
  const now = reference.getTime();

  const newMembers: number[] = [];
  const activeMembers: number[] = [];
  const expiringSoon: number[] = [];
  const expired: number[] = [];

  for (const bucket of buckets) {
    let newCount = 0;
    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    const expiringWindowEnd = new Date(bucket.end);
    expiringWindowEnd.setDate(expiringWindowEnd.getDate() + 7);

    for (const m of members) {
      if (inRange(m.createdAt, bucket.start, bucket.end)) {
        newCount++;
      }

      const endDate = m.endDate;
      if (endDate) {
        if (endDate.getTime() >= bucket.end.getTime()) {
          activeCount++;
        }
        if (
          endDate.getTime() > bucket.end.getTime() &&
          endDate.getTime() <= expiringWindowEnd.getTime()
        ) {
          expiringCount++;
        }
        if (inRange(endDate, bucket.start, bucket.end) && endDate.getTime() < now) {
          expiredCount++;
        }
      }
    }

    newMembers.push(newCount);
    activeMembers.push(activeCount);
    expiringSoon.push(expiringCount);
    expired.push(expiredCount);
  }

  return { activeMembers, newMembers, expiringSoon, expired };
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

function sparklineTrendLabel(values: number[], periodLabel = "last week"): string | undefined {
  if (values.length < 2) return undefined;
  return formatTrendLabel(values[values.length - 1], values[values.length - 2], periodLabel);
}

function computePackageDistribution(
  members: MemberListItem[],
): PackageDistributionPoint[] {
  const counts = new Map<string, number>();
  for (const m of members) {
    if (m.status !== "ACTIVE" && m.status !== "EXPIRING_SOON") continue;
    const name = m.packageName ?? "No package";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Visual trend series for financial KPI cards (approximate for pending). */
export async function getFinancialSparklines(
  gymId: string,
  collectionExpected: number,
  pendingTotal: number,
  monthCount = 6,
): Promise<FinancialSparklines> {
  const now = new Date();
  const startMonth = new Date(
    now.getFullYear(),
    now.getMonth() - (monthCount - 1),
    1,
  );

  const monthBuckets: { key: string; start: Date; end: Date }[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    monthBuckets.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      start,
      end,
    });
  }

  const weekBuckets = lastNWeekBuckets(SPARKLINE_WEEKS, now);

  const payments = await withTenant(gymId, (tx) =>
    tx.payment.findMany({
      where: { gymId, paidAt: { gte: startMonth } },
      select: { amount: true, paidAt: true },
    }),
  );

  const revenue = monthBuckets.map(() => 0);
  const monthIndex = new Map(monthBuckets.map((b, i) => [b.key, i]));

  for (const payment of payments) {
    const d = new Date(payment.paidAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const idx = monthIndex.get(key);
    if (idx !== undefined) {
      revenue[idx] += Number(payment.amount);
    }
  }

  const monthlyExpected =
    collectionExpected > 0 ? collectionExpected / monthCount : 0;

  const collectionRate = revenue.map((paid) =>
    monthlyExpected > 0
      ? Math.min(100, Math.round((paid / monthlyExpected) * 100))
      : paid > 0
        ? 100
        : 0,
  );

  const weeklyPaymentCounts = weekBuckets.map((bucket) => {
    let count = 0;
    for (const payment of payments) {
      if (inRange(new Date(payment.paidAt), bucket.start, bucket.end)) {
        count++;
      }
    }
    return count;
  });

  const maxWeekly = Math.max(...weeklyPaymentCounts, 1);
  const pending = weeklyPaymentCounts.map((count) => {
    const factor = 0.55 + 0.45 * (1 - count / maxWeekly);
    return Math.round(pendingTotal * factor);
  });

  return { revenue, collectionRate, pending };
}

export async function getDashboardMetrics(gymId: string): Promise<DashboardMetrics> {
  const now = new Date();
  const { startThisMonth, startLastMonth } = monthBounds(now);

  const [members, newMembersThisMonth, newMembersLastMonth] = await Promise.all([
    getMembersWithStatus(gymId),
    withTenant(gymId, (tx) =>
      tx.member.count({
        where: { gymId, createdAt: { gte: startThisMonth } },
      }),
    ),
    withTenant(gymId, (tx) =>
      tx.member.count({
        where: {
          gymId,
          createdAt: { gte: startLastMonth, lt: startThisMonth },
        },
      }),
    ),
  ]);

  const activeCount = members.filter(
    (m) => m.status === "ACTIVE" || m.status === "EXPIRING_SOON",
  ).length;

  const expiringSoon = members
    .filter((m) => m.status === "EXPIRING_SOON")
    .sort((a, b) => (a.endDate?.getTime() ?? 0) - (b.endDate?.getTime() ?? 0));

  const expiredCount = members.filter((m) => m.status === "EXPIRED").length;

  let collectionCollected = 0;
  let collectionExpected = 0;
  for (const m of members) {
    if (m.subsAmount == null) continue;
    collectionExpected += m.subsAmount;
    collectionCollected += m.paidAmount ?? 0;
  }
  const collectionRatePercent =
    collectionExpected > 0
      ? Math.round((collectionCollected / collectionExpected) * 100)
      : 100;

  const pendingMembers = members.filter((m) => m.pendingAmount > 0);
  const pendingTotal = pendingMembers.reduce((sum, m) => sum + m.pendingAmount, 0);

  const sparklines = computeSparklines(members, now);

  return {
    totalMembers: members.length,
    activeCount,
    activeMembersTrendLabel: sparklineTrendLabel(sparklines.activeMembers),
    expiringSoonCount: expiringSoon.length,
    expiredCount,
    expiringSoon,
    newMembersThisMonth,
    newMembersLastMonth,
    newMembersHint: formatNewMembersHint(newMembersThisMonth, newMembersLastMonth),
    newMembersTrendLabel: formatTrendLabel(
      newMembersThisMonth,
      newMembersLastMonth,
    ),
    collectionRatePercent,
    collectionCollected,
    collectionExpected,
    collectionHint: `${formatCurrency(collectionCollected)} / ${formatCurrency(collectionExpected)} expected`,
    pendingTotal,
    pendingMemberCount: pendingMembers.length,
    pendingHint: `${formatCurrency(pendingTotal)} • ${pendingMembers.length} member${pendingMembers.length === 1 ? "" : "s"}`,
    packageDistribution: computePackageDistribution(members),
    sparklines,
  };
}
