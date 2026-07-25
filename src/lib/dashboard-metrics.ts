import { withTenant } from "@/lib/db-context";
import { getMembersWithStatus, type MemberListItem } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export type PackageDistributionPoint = {
  name: string;
  count: number;
};

export type DashboardMetrics = {
  totalMembers: number;
  activeCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  expiringSoon: MemberListItem[];
  newMembersThisMonth: number;
  newMembersLastMonth: number;
  newMembersHint: string;
  collectionRatePercent: number;
  collectionCollected: number;
  collectionExpected: number;
  collectionHint: string;
  pendingTotal: number;
  pendingMemberCount: number;
  pendingHint: string;
  packageDistribution: PackageDistributionPoint[];
};

function monthBounds(reference: Date) {
  const startThisMonth = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const startLastMonth = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  return { startThisMonth, startLastMonth };
}

function formatNewMembersHint(thisMonth: number, lastMonth: number): string {
  if (lastMonth === 0) {
    if (thisMonth === 0) return "No new members this month";
    return `+${thisMonth} this month — no joins last month`;
  }
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "→";
  const pctLabel = pct === 0 ? "same as last month" : `${Math.abs(pct)}% from last month`;
  return `+${thisMonth} this month ${arrow} ${pctLabel}`;
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

  return {
    totalMembers: members.length,
    activeCount,
    expiringSoonCount: expiringSoon.length,
    expiredCount,
    expiringSoon,
    newMembersThisMonth,
    newMembersLastMonth,
    newMembersHint: formatNewMembersHint(newMembersThisMonth, newMembersLastMonth),
    collectionRatePercent,
    collectionCollected,
    collectionExpected,
    collectionHint: `${formatCurrency(collectionCollected)} / ${formatCurrency(collectionExpected)} expected`,
    pendingTotal,
    pendingMemberCount: pendingMembers.length,
    pendingHint: `${formatCurrency(pendingTotal)} • ${pendingMembers.length} member${pendingMembers.length === 1 ? "" : "s"}`,
    packageDistribution: computePackageDistribution(members),
  };
}
