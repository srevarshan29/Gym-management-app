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
  package: { name: string };
  createdBy: { name: string } | null;
};

type FetchMembersOptions = {
  /** When false, skips payment aggregation (renewals/expired lists). */
  includeBalance?: boolean;
};

async function fetchMembersWithStatus(
  tx: Prisma.TransactionClient,
  tenantGymId: string,
  options: FetchMembersOptions = {},
): Promise<MemberListItem[]> {
  const includeBalance = options.includeBalance ?? true;

  const [members, subscriptions] = await Promise.all([
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
        trainer: { select: { id: true, name: true } },
      },
    }),
    tx.subscription.findMany({
      where: { gymId: tenantGymId },
      select: {
        id: true,
        memberId: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        priceAtPurchase: true,
        package: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  const subsByMember = new Map<string, SubscriptionRow[]>();
  for (const sub of subscriptions) {
    const list = subsByMember.get(sub.memberId) ?? [];
    list.push(sub);
    subsByMember.set(sub.memberId, list);
  }

  const currentSubByMember = new Map<string, SubscriptionRow>();
  const addedByNameByMember = new Map<string, string | null>();

  for (const [memberId, subs] of subsByMember) {
    const current = [...subs].sort(
      (a, b) => b.endDate.getTime() - a.endDate.getTime(),
    )[0]!;
    currentSubByMember.set(memberId, current);

    const firstByCreated = [...subs].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    )[0];
    addedByNameByMember.set(memberId, firstByCreated?.createdBy?.name ?? null);
  }

  const paidBySubId = new Map<string, number>();
  if (includeBalance) {
    const currentIds = [...currentSubByMember.values()].map((s) => s.id);
    if (currentIds.length > 0) {
      const groups = await tx.payment.groupBy({
        by: ["subscriptionId"],
        where: {
          gymId: tenantGymId,
          subscriptionId: { in: currentIds },
        },
        _sum: { amount: true },
      });
      for (const row of groups) {
        if (row.subscriptionId) {
          paidBySubId.set(row.subscriptionId, Number(row._sum.amount ?? 0));
        }
      }
    }
  }

  return members.map((m) => {
    const current = currentSubByMember.get(m.id);
    const balance =
      includeBalance && current
        ? computeSubscriptionBalance(
            Number(current.priceAtPurchase),
            paidBySubId.get(current.id) ?? 0,
          )
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
      pendingAmount: balance?.pendingAmount ?? 0,
      addedByName: addedByNameByMember.get(m.id) ?? null,
      isPt: m.isPt,
      trainerId: m.trainerId,
      trainerName: m.trainer?.name ?? null,
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

/**
 * Members whose current subscription has an outstanding balance
 * (priceAtPurchase minus linked payments, floored at 0).
 */
export async function getPendingMembers(
  tenantGymId: string,
): Promise<PendingMember[]> {
  const members = await getMembersWithStatus(tenantGymId);

  return members
    .filter(
      (m): m is MemberListItem & { currentSubscriptionId: string } =>
        m.pendingAmount > 0 && m.currentSubscriptionId != null,
    )
    .map((m) => ({
      memberId: m.id,
      memberNumber: m.memberNumber,
      memberName: m.name,
      phone: m.phone,
      photoUrl: m.photoUrl,
      gender: m.gender,
      subscriptionId: m.currentSubscriptionId,
      packageName: m.packageName ?? "—",
      subsAmount: m.subsAmount ?? 0,
      paidAmount: m.paidAmount ?? 0,
      amountDue: m.pendingAmount,
      endDate: m.endDate!,
      status: m.status,
    }))
    .sort((a, b) => b.amountDue - a.amountDue);
}

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
