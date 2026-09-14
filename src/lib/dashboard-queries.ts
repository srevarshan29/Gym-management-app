import type { MemberGender } from "@prisma/client";

import { getRepositories, platformContext } from "@/lib/firestore";
import {
  filterExpiredMemberships,
  filterUpcomingRenewals,
  type MembershipRenewalRow,
} from "@/lib/queries";
import { EXPIRING_SOON_DAYS, statusFromEndDate } from "@/lib/subscription";

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

export async function queryDashboardStatusCounts(
  tenantGymId: string,
  cutoffs: StatusCutoffs,
): Promise<DashboardStatusCounts> {
  const { members } = getRepositories();
  const [totalMembers, all] = await Promise.all([
    members.countByGym(platformContext, tenantGymId),
    members.listAllWithStatus(platformContext, tenantGymId),
  ]);

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

export async function queryCurrentCycleCollection(
  tenantGymId: string,
): Promise<DashboardCollectionTotals> {
  const { members, subscriptions } = getRepositories();
  const all = await members.listAllWithStatus(platformContext, tenantGymId);
  let collectionExpected = 0;
  let collectionCollected = 0;

  for (const m of all) {
    if (!m.currentSubscriptionId) continue;
    const sub = await subscriptions.findById(
      platformContext,
      tenantGymId,
      m.currentSubscriptionId,
    );
    if (!sub) continue;
    collectionExpected += sub.priceAtPurchase;
    collectionCollected += sub.paidTotal;
  }

  return { collectionExpected, collectionCollected };
}

export async function queryPackageDistribution(
  tenantGymId: string,
  cutoffs: StatusCutoffs,
): Promise<PackageCountRow[]> {
  const { members } = getRepositories();
  const all = await members.listAllWithStatus(platformContext, tenantGymId);
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

export async function queryUpcomingRenewalPreview(
  tenantGymId: string,
  _cutoffs: StatusCutoffs,
  limit = 5,
): Promise<MembershipRenewalRow[]> {
  void _cutoffs;
  const { members } = getRepositories();
  const all = await members.listAllWithStatus(platformContext, tenantGymId);
  return filterUpcomingRenewals(all).slice(0, limit);
}

export async function queryExpiredMembershipPreview(
  tenantGymId: string,
  _cutoffs: StatusCutoffs,
  limit = 5,
): Promise<MembershipRenewalRow[]> {
  void _cutoffs;
  const { members } = getRepositories();
  const all = await members.listAllWithStatus(platformContext, tenantGymId);
  return filterExpiredMemberships(all).slice(0, limit);
}

export type MemberSparklineRow = {
  idx: number;
  newCount: number;
  activeCount: number;
  expiringCount: number;
  expiredCount: number;
};

export async function queryMemberSparklines(
  tenantGymId: string,
  buckets: WeekBucket[],
  now: Date,
): Promise<MemberSparklineRow[]> {
  if (buckets.length === 0) return [];
  const { members } = getRepositories();
  const all = await members.listAllWithStatus(platformContext, tenantGymId);
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

export async function queryWeeklyPaymentCounts(
  tenantGymId: string,
  buckets: WeekBucket[],
): Promise<number[]> {
  if (buckets.length === 0) return [];
  const { payments } = getRepositories();
  const all = await payments.listByMember(platformContext, tenantGymId, "");
  void all;
  const db = (await import("@/lib/firebase/admin")).getFirestoreDb();
  const snap = await db
    .collection("payments")
    .where("gymId", "==", tenantGymId)
    .get();
  const pays = snap.docs.map((d) => (d.data() as { paidAt: { toDate(): Date } }).paidAt.toDate());

  return buckets.map((bucket) =>
    pays.filter((p) => p >= bucket.start && p <= bucket.end).length,
  );
}
