import type { Prisma } from "@prisma/client";

import type { MemberGender } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import {
  computeSubscriptionBalance,
  sumPaymentAmounts,
} from "@/lib/subscription-balance";
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
  packageName: string | null;
  currentSubscriptionId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: SubscriptionStatus;
  subsAmount: number | null;
  paidAmount: number | null;
  pendingAmount: number;
  addedByName: string | null;
};

async function fetchMembersWithStatus(
  tx: Prisma.TransactionClient,
  gymId: string,
): Promise<MemberListItem[]> {
  const members = await tx.member.findMany({
    where: { gymId },
    orderBy: { createdAt: "desc" },
    include: {
      subscriptions: {
        orderBy: { createdAt: "asc" },
        include: {
          package: { select: { name: true } },
          payments: { select: { amount: true } },
          createdBy: { select: { name: true } },
        },
      },
    },
  });

  return members.map((m) => {
    const current =
      m.subscriptions.length > 0
        ? [...m.subscriptions].sort(
            (a, b) => b.endDate.getTime() - a.endDate.getTime(),
          )[0]
        : undefined;
    const addedByName = m.subscriptions[0]?.createdBy?.name ?? null;
    const balance = current
      ? computeSubscriptionBalance(
          Number(current.priceAtPurchase),
          sumPaymentAmounts(current.payments),
        )
      : null;

    return {
      id: m.id,
      memberNumber: m.memberNumber,
      name: m.name,
      phone: m.phone,
      photoUrl: m.photoUrl,
      gender: m.gender,
      packageName: current?.package.name ?? null,
      currentSubscriptionId: current?.id ?? null,
      startDate: current?.startDate ?? null,
      endDate: current?.endDate ?? null,
      status: statusFromEndDate(current?.endDate),
      subsAmount: balance?.subsAmount ?? null,
      paidAmount: balance?.paidAmount ?? null,
      pendingAmount: balance?.pendingAmount ?? 0,
      addedByName,
    };
  });
}

/**
 * All members of the given gym with their current (latest by endDate)
 * subscription and installment balance on that period.
 */
export async function getMembersWithStatus(gymId: string): Promise<MemberListItem[]> {
  return withTenant(gymId, (tx) => fetchMembersWithStatus(tx, gymId));
}

export type PendingMember = {
  memberId: string;
  memberNumber: number;
  memberName: string;
  phone: string;
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
export async function getPendingMembers(gymId: string): Promise<PendingMember[]> {
  const members = await getMembersWithStatus(gymId);

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
      subscriptionId: m.currentSubscriptionId,
      packageName: m.packageName ?? "—",
      subsAmount: m.subsAmount ?? 0,
      paidAmount: m.paidAmount ?? 0,
      amountDue: m.pendingAmount,
      endDate: m.endDate!,
      status: m.status,
    }));
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
export async function getExpiredMemberships(
  gymId: string,
): Promise<MembershipRenewalRow[]> {
  const members = await getMembersWithStatus(gymId);
  return members
    .filter(
      (m): m is MemberListItem & { endDate: Date } =>
        m.status === "EXPIRED" && m.endDate != null,
    )
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())
    .map(toMembershipRenewalRow);
}

/** Members expiring within EXPIRING_SOON_DAYS, soonest expiry first. */
export async function getUpcomingRenewals(
  gymId: string,
): Promise<MembershipRenewalRow[]> {
  const members = await getMembersWithStatus(gymId);
  return members
    .filter(
      (m): m is MemberListItem & { endDate: Date } =>
        m.status === "EXPIRING_SOON" && m.endDate != null,
    )
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime())
    .map(toMembershipRenewalRow);
}

/**
 * Looks up a member by id, but ONLY within the given gym. If the member
 * exists but belongs to a different gym, this returns null exactly as if
 * the member didn't exist — callers must never be able to distinguish
 * "not found" from "belongs to another tenant".
 */
export async function getMemberDetail(gymId: string, id: string) {
  return withTenant(gymId, (tx) =>
    tx.member.findFirst({
      where: { id, gymId },
      include: {
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
