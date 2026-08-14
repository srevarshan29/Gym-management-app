import type { Prisma } from "@prisma/client";

import type { MemberGender } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import { computeSubscriptionBalance } from "@/lib/subscription-balance";
import {
  statusFromEndDate,
  type SubscriptionStatus,
} from "@/lib/subscription";

export type MemberListItem = {
  id: string;
  memberNumber: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  createdAt: Date;
  packageName: string | null;
  currentSubscriptionId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: SubscriptionStatus;
  subsAmount: number | null;
  paidAmount: number | null;
  pendingAmount: number;
  addedByName: string | null;
  isPt: boolean;
  trainerId: string | null;
  trainerName: string | null;
};

type SubscriptionRow = {
  id: string;
  memberId: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  priceAtPurchase: Prisma.Decimal;
  writtenOffAmount: Prisma.Decimal;
  package: { name: string };
  createdBy: { name: string } | null;
};

type FetchMembersOptions = {
  /** When false, skips payment aggregation (renewals/expired lists). */
  includeBalance?: boolean;
  /** When false, skips the trainer join (members directory). */
  includeTrainer?: boolean;
};

const subscriptionSelect = {
  id: true,
  memberId: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  priceAtPurchase: true,
  writtenOffAmount: true,
  package: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const;

async function fetchMembersWithStatus(
  tx: Prisma.TransactionClient,
  tenantGymId: string,
  options: FetchMembersOptions = {},
): Promise<MemberListItem[]> {
  const includeBalance = options.includeBalance ?? true;
  const includeTrainer = options.includeTrainer ?? true;

  const [members, currentIdRows, firstIdRows] = await Promise.all([
    tx.member.findMany({
      where: { gymId: tenantGymId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        memberNumber: true,
        name: true,
        phone: true,
        photoUrl: true,
        gender: true,
        createdAt: true,
        isPt: true,
        trainerId: true,
        ...(includeTrainer
          ? { trainer: { select: { id: true, name: true } } }
          : {}),
      },
    }),
    tx.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT ON ("memberId") id
      FROM "Subscription"
      WHERE "gymId" = ${tenantGymId}
      ORDER BY "memberId", "endDate" DESC, "createdAt" DESC
    `,
    tx.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT ON ("memberId") id
      FROM "Subscription"
      WHERE "gymId" = ${tenantGymId}
      ORDER BY "memberId", "createdAt" ASC
    `,
  ]);

  const currentIds = currentIdRows.map((row) => row.id);
  const firstIds = firstIdRows.map((row) => row.id);
  const uniqueIds = [...new Set([...currentIds, ...firstIds])];

  const [subscriptions, paymentGroups, allSubsForBalance] = await Promise.all([
    uniqueIds.length === 0
      ? Promise.resolve([] as SubscriptionRow[])
      : tx.subscription.findMany({
          where: { gymId: tenantGymId, id: { in: uniqueIds } },
          select: subscriptionSelect,
        }),
    includeBalance
      ? tx.payment.groupBy({
          by: ["subscriptionId"],
          where: {
            gymId: tenantGymId,
            subscriptionId: { not: null },
          },
          _sum: { amount: true },
        })
      : Promise.resolve([]),
    includeBalance
      ? tx.subscription.findMany({
          where: { gymId: tenantGymId },
          select: {
            id: true,
            memberId: true,
            priceAtPurchase: true,
            writtenOffAmount: true,
          },
        })
      : Promise.resolve(
          [] as {
            id: string;
            memberId: string;
            priceAtPurchase: Prisma.Decimal;
            writtenOffAmount: Prisma.Decimal;
          }[],
        ),
  ]);

  const byId = new Map(subscriptions.map((row) => [row.id, row]));
  const currentSubByMember = new Map<string, SubscriptionRow>();
  const addedByNameByMember = new Map<string, string | null>();
  for (const id of currentIds) {
    const row = byId.get(id);
    if (row) currentSubByMember.set(row.memberId, row);
  }
  for (const id of firstIds) {
    const row = byId.get(id);
    if (row) addedByNameByMember.set(row.memberId, row.createdBy?.name ?? null);
  }

  const paidBySubId = new Map<string, number>();
  for (const row of paymentGroups) {
    if (row.subscriptionId) {
      paidBySubId.set(row.subscriptionId, Number(row._sum.amount ?? 0));
    }
  }

  const pendingByMember = new Map<string, number>();
  for (const sub of allSubsForBalance) {
    const cycle = computeSubscriptionBalance(
      Number(sub.priceAtPurchase),
      paidBySubId.get(sub.id) ?? 0,
      Number(sub.writtenOffAmount),
    );
    if (cycle.pendingAmount <= 0) continue;
    pendingByMember.set(
      sub.memberId,
      (pendingByMember.get(sub.memberId) ?? 0) + cycle.pendingAmount,
    );
  }

  return members.map((m) => {
    const current = currentSubByMember.get(m.id);
    const balance =
      includeBalance && current
        ? computeSubscriptionBalance(
            Number(current.priceAtPurchase),
            paidBySubId.get(current.id) ?? 0,
            Number(current.writtenOffAmount),
          )
        : null;
    const trainer =
      includeTrainer && "trainer" in m
        ? (m.trainer as { id: string; name: string } | null)
        : null;

    return {
      id: m.id,
      memberNumber: m.memberNumber,
      name: m.name,
      phone: m.phone,
      photoUrl: m.photoUrl,
      gender: m.gender,
      createdAt: m.createdAt,
      packageName: current?.package.name ?? null,
      currentSubscriptionId: current?.id ?? null,
      startDate: current?.startDate ?? null,
      endDate: current?.endDate ?? null,
      status: statusFromEndDate(current?.endDate),
      subsAmount: balance?.subsAmount ?? null,
      paidAmount: balance?.paidAmount ?? null,
      pendingAmount: includeBalance ? (pendingByMember.get(m.id) ?? 0) : 0,
      addedByName: addedByNameByMember.get(m.id) ?? null,
      isPt: m.isPt,
      trainerId: m.trainerId,
      trainerName: trainer?.name ?? null,
    };
  });
}

/**
 * All members of the given gym with their current (latest by endDate)
 * subscription and installment balance on that period.
 */
export async function getMembersWithStatus(
  tenantGymId: string,
): Promise<MemberListItem[]> {
  return withTenant(tenantGymId, (tx) =>
    fetchMembersWithStatus(tx, tenantGymId, { includeBalance: true }),
  );
}

/** Members directory: current package/status/dues only — no trainer join. */
export async function getMembersDirectory(
  tenantGymId: string,
): Promise<MemberListItem[]> {
  return withTenant(tenantGymId, (tx) =>
    fetchMembersWithStatus(tx, tenantGymId, {
      includeBalance: true,
      includeTrainer: false,
    }),
  );
}

/**
 * One unpaid subscription cycle. Loaded via getPendingDuesPage
 * (SQL + pagination; includes prior cycles after renewal).
 */
export type PendingMember = {
  memberId: string;
  memberNumber: number;
  memberName: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  subscriptionId: string;
  packageName: string;
  subsAmount: number;
  paidAmount: number;
  amountDue: number;
  endDate: Date;
  status: SubscriptionStatus;
};

export type SubscriptionSummaryCounts = {
  active: number;
  expiringSoon: number;
  expired: number;
};

/** Mutually exclusive lifecycle buckets (ACTIVE / EXPIRING_SOON / EXPIRED only). */
export function subscriptionSummaryCounts(
  members: MemberListItem[],
): SubscriptionSummaryCounts {
  let active = 0;
  let expiringSoon = 0;
  let expired = 0;
  for (const m of members) {
    if (m.status === "ACTIVE") active += 1;
    else if (m.status === "EXPIRING_SOON") expiringSoon += 1;
    else if (m.status === "EXPIRED") expired += 1;
  }
  return { active, expiringSoon, expired };
}

export async function getSubscriptionSummaryCounts(
  tenantGymId: string,
): Promise<SubscriptionSummaryCounts> {
  const members = await withTenant(tenantGymId, (tx) =>
    fetchMembersWithStatus(tx, tenantGymId, { includeBalance: false }),
  );
  return subscriptionSummaryCounts(members);
}

export type MembershipRenewalRow = {
  id: string;
  memberNumber: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  packageName: string;
  endDate: Date;
};

function toMembershipRenewalRow(
  m: MemberListItem & { endDate: Date },
): MembershipRenewalRow {
  return {
    id: m.id,
    memberNumber: m.memberNumber,
    name: m.name,
    phone: m.phone,
    photoUrl: m.photoUrl,
    gender: m.gender,
    packageName: m.packageName ?? "—",
    endDate: m.endDate,
  };
}

/** Members whose current subscription has expired, most recently expired first. */
export function filterExpiredMemberships(
  members: MemberListItem[],
): MembershipRenewalRow[] {
  return members
    .filter(
      (m): m is MemberListItem & { endDate: Date } =>
        m.status === "EXPIRED" && m.endDate != null,
    )
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())
    .map(toMembershipRenewalRow);
}

export async function getExpiredMemberships(
  tenantGymId: string,
): Promise<MembershipRenewalRow[]> {
  const members = await withTenant(tenantGymId, (tx) =>
    fetchMembersWithStatus(tx, tenantGymId, { includeBalance: false }),
  );
  return filterExpiredMemberships(members);
}

/** Members expiring within EXPIRING_SOON_DAYS, soonest expiry first. */
export function filterUpcomingRenewals(
  members: MemberListItem[],
): MembershipRenewalRow[] {
  return members
    .filter(
      (m): m is MemberListItem & { endDate: Date } =>
        m.status === "EXPIRING_SOON" && m.endDate != null,
    )
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .map(toMembershipRenewalRow);
}

export async function getUpcomingRenewals(
  tenantGymId: string,
): Promise<MembershipRenewalRow[]> {
  const members = await withTenant(tenantGymId, (tx) =>
    fetchMembersWithStatus(tx, tenantGymId, { includeBalance: false }),
  );
  return filterUpcomingRenewals(members);
}

/**
 * Looks up a member by id, but ONLY within the given gym. If the member
 * exists but belongs to a different gym, this returns null exactly as if
 * the member didn't exist — callers must never be able to distinguish
 * "not found" from "belongs to another tenant".
 */
export async function getMemberDetail(tenantGymId: string, id: string) {
  return withTenant(tenantGymId, (tx) =>
    tx.member.findFirst({
      where: { id: id, gymId: tenantGymId },
      include: {
        trainer: { select: { id: true, name: true } },
        subscriptions: {
          orderBy: { startDate: "desc" },
          include: {
            package: { select: { name: true } },
            createdBy: { select: { name: true } },
            payments: { select: { amount: true } },
          },
        },
        payments: {
          orderBy: { paidAt: "desc" },
          include: {
            recordedBy: { select: { name: true } },
            subscription: {
              include: { package: { select: { name: true } } },
            },
          },
        },
      },
    }),
  );
}
