import { getRepositories, platformContext } from "@/lib/firestore";
import { getFirestoreDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import {
  filterExpiredMemberships,
  filterUpcomingRenewals,
  type MemberListItem,
  type MembershipRenewalRow,
} from "@/lib/queries";
import { EXPIRING_SOON_DAYS } from "@/lib/subscription";

export type WeekBucket = { start: Date; end: Date };

export type StatusCutoffs = {
  startOfToday: Date;
  firstActiveMidnight: Date;
};

export type PackageCountRow = {
  name: string;
  count: number;
};

export function statusCutoffs(now = new Date()): StatusCutoffs {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const firstActiveMidnight = new Date(startOfToday);
  firstActiveMidnight.setDate(
    firstActiveMidnight.getDate() + EXPIRING_SOON_DAYS + 1,
  );
  return { startOfToday, firstActiveMidnight };
}

export type DashboardStatusCounts = {
  totalMembers: number;
  activeOrExpiringCount: number;
  expiringSoonCount: number;
  expiredCount: number;
};

export function computeDashboardStatusCounts(
  totalMembers: number,
  all: MemberListItem[],
  cutoffs: StatusCutoffs,
): DashboardStatusCounts {
  let activeOrExpiringCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;

  for (const m of all) {
    const end = m.endDate;
    if (!end) continue;
    if (end >= cutoffs.startOfToday) activeOrExpiringCount += 1;
    if (end >= cutoffs.startOfToday && end < cutoffs.firstActiveMidnight) {
      expiringSoonCount += 1;
    }
    if (end < cutoffs.startOfToday) expiredCount += 1;
  }

  return {
    totalMembers,
    activeOrExpiringCount,
    expiringSoonCount,
    expiredCount,
  };
}

export type DashboardPendingTotals = {
  pendingTotal: number;
  pendingMemberCount: number;
};

export async function queryAllCyclePendingTotals(
  tenantGymId: string,
): Promise<DashboardPendingTotals> {
  const { subscriptions } = getRepositories();
  return subscriptions.sumPendingTotals(platformContext, tenantGymId);
}

export type DashboardCollectionTotals = {
  collectionExpected: number;
  collectionCollected: number;
};

/**
 * Current-cycle collection uses `priceAtPurchase` and `paidTotal`, which live
 * only on subscription documents — they are not denormalized onto members
 * (members only carry `pendingAmountTotal`, summed across all cycles).
 */
export function computeCurrentCycleCollection(
  all: MemberListItem[],
  subsById: Map<
    string,
    { priceAtPurchase: number; paidTotal: number }
  >,
): DashboardCollectionTotals {
  let collectionExpected = 0;
  let collectionCollected = 0;

  for (const m of all) {
    if (!m.currentSubscriptionId) continue;
    const sub = subsById.get(m.currentSubscriptionId);
    if (!sub) continue;
    collectionExpected += sub.priceAtPurchase;
    collectionCollected += sub.paidTotal;
  }

  return { collectionExpected, collectionCollected };
}

export function computePackageDistribution(
  all: MemberListItem[],
  cutoffs: StatusCutoffs,
): PackageCountRow[] {
  const counts = new Map<string, number>();

  for (const m of all) {
    if (!m.endDate || m.endDate < cutoffs.startOfToday) continue;
    const name = m.packageName ?? "No package";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function computeUpcomingRenewalPreview(
  all: MemberListItem[],
  _cutoffs: StatusCutoffs,
  limit = 5,
): MembershipRenewalRow[] {
  void _cutoffs;
  return filterUpcomingRenewals(all).slice(0, limit);
}

export function computeExpiredMembershipPreview(
  all: MemberListItem[],
  _cutoffs: StatusCutoffs,
  limit = 5,
): MembershipRenewalRow[] {
  void _cutoffs;
  return filterExpiredMemberships(all).slice(0, limit);
}

export type MemberSparklineRow = {
  idx: number;
  newCount: number;
  activeCount: number;
  expiringCount: number;
  expiredCount: number;
};

export function computeMemberSparklines(
  all: MemberListItem[],
  buckets: WeekBucket[],
  now: Date,
): MemberSparklineRow[] {
  if (buckets.length === 0) return [];
  const cutoffs = statusCutoffs(now);

  return buckets.map((bucket, idx) => {
    let newCount = 0;
    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;

    for (const m of all) {
      const created = m.createdAt;
      if (created >= bucket.start && created <= bucket.end) newCount += 1;
      const end = m.endDate;
      if (!end) continue;
      if (end >= bucket.end) activeCount += 1;
      if (end > bucket.end && end <= new Date(bucket.end.getTime() + 7 * 86400000)) {
        expiringCount += 1;
      }
      if (
        end >= bucket.start &&
        end <= bucket.end &&
        end < cutoffs.startOfToday
      ) {
        expiredCount += 1;
      }
    }

    return { idx, newCount, activeCount, expiringCount, expiredCount };
  });
}

export type DashboardMemberMetrics = {
  status: DashboardStatusCounts;
  pending: DashboardPendingTotals;
  collection: DashboardCollectionTotals;
  packageDistribution: PackageCountRow[];
  upcomingPreview: MembershipRenewalRow[];
  expiredPreview: MembershipRenewalRow[];
  sparkRows: MemberSparklineRow[];
  newMembersThisMonth: number;
  newMembersLastMonth: number;
};

/**
 * Loads dashboard member-derived metrics with a single member list fetch,
 * then derives all KPIs from that in-memory snapshot.
 */
export async function loadDashboardMemberMetrics(
  tenantGymId: string,
  cutoffs: StatusCutoffs,
  weekBuckets: WeekBucket[],
  now: Date,
  monthBounds: { startThisMonth: Date; startLastMonth: Date },
): Promise<DashboardMemberMetrics> {
  const { members, subscriptions } = getRepositories();
  const db = getFirestoreDb();

  const countSince = async (start: Date, end?: Date) => {
    let q = db
      .collection("members")
      .where("gymId", "==", tenantGymId)
      .where("createdAt", ">=", Timestamp.fromDate(start));
    if (end) {
      q = q.where("createdAt", "<", Timestamp.fromDate(end));
    }
    const snap = await q.count().get();
    return snap.data().count;
  };

  const [totalMembers, allMembers, pendingTotals, thisMonth, lastMonth] =
    await Promise.all([
      members.countByGym(platformContext, tenantGymId),
      members.listAllWithStatus(platformContext, tenantGymId),
      queryAllCyclePendingTotals(tenantGymId),
      countSince(monthBounds.startThisMonth),
      countSince(monthBounds.startLastMonth, monthBounds.startThisMonth),
    ]);

  const subscriptionIds = allMembers
    .map((m) => m.currentSubscriptionId)
    .filter((id): id is string => Boolean(id));
  const subsById = await subscriptions.findManyByIds(
    platformContext,
    tenantGymId,
    subscriptionIds,
  );

  const status = computeDashboardStatusCounts(totalMembers, allMembers, cutoffs);
  const collection = computeCurrentCycleCollection(allMembers, subsById);
  const packageDistribution = computePackageDistribution(allMembers, cutoffs);
  const upcomingPreview = computeUpcomingRenewalPreview(allMembers, cutoffs);
  const expiredPreview = computeExpiredMembershipPreview(allMembers, cutoffs);
  const sparkRows = computeMemberSparklines(allMembers, weekBuckets, now);

  return {
    status,
    pending: pendingTotals,
    collection,
    packageDistribution,
    upcomingPreview,
    expiredPreview,
    sparkRows,
    newMembersThisMonth: thisMonth,
    newMembersLastMonth: lastMonth,
  };
}

export async function queryWeeklyPaymentCounts(
  tenantGymId: string,
  buckets: WeekBucket[],
): Promise<number[]> {
  if (buckets.length === 0) return [];
  const { payments } = getRepositories();
  const rangeStart = buckets[0]!.start;
  const rangeEnd = buckets[buckets.length - 1]!.end;
  const rows = await payments.listSince(platformContext, tenantGymId, rangeStart);
  const pays = rows
    .map((p) => p.paidAt.toDate())
    .filter((paidAt) => paidAt <= rangeEnd);

  return buckets.map((bucket) =>
    pays.filter((p) => p >= bucket.start && p <= bucket.end).length,
  );
}
