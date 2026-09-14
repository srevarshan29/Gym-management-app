import type { MemberGender } from "@prisma/client";

import { getRepositories, platformContext } from "@/lib/firestore";
import type {
  MembershipRenewalRow,
  PendingMember,
} from "@/lib/member-list-types";
import { computeSubscriptionBalance } from "@/lib/subscription-balance";
import {
  statusFromEndDate,
  type SubscriptionStatus,
} from "@/lib/subscription";

export type { MembershipRenewalRow, PendingMember } from "@/lib/member-list-types";

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

export async function getMembersWithStatus(
  tenantGymId: string,
): Promise<MemberListItem[]> {
  const { members } = getRepositories();
  return members.listAllWithStatus(platformContext, tenantGymId);
}

export type SubscriptionSummaryCounts = {
  active: number;
  expiringSoon: number;
  expired: number;
};

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
  const members = await getMembersWithStatus(tenantGymId);
  return subscriptionSummaryCounts(members);
}

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

export async function getMemberDetail(tenantGymId: string, id: string) {
  const { members, subscriptions, payments, users } = getRepositories();

  const member = await members.findByIdAndGym(platformContext, id, tenantGymId);
  if (!member) return null;

  const [subs, pays] = await Promise.all([
    subscriptions.listByMember(platformContext, tenantGymId, id),
    payments.listByMember(platformContext, tenantGymId, id),
  ]);

  let trainer: { id: string; name: string } | null = null;
  if (member.trainerId) {
    const t = await users.findById(platformContext, member.trainerId);
    if (t && t.gymId === tenantGymId) {
      trainer = { id: t.id, name: t.name };
    }
  }

  const creatorIds = [
    ...new Set(
      subs.map((s) => s.createdById).filter((id): id is string => !!id),
    ),
  ];
  const creators = new Map<string, string>();
  await Promise.all(
    creatorIds.map(async (id) => {
      const u = await users.findById(platformContext, id);
      if (u) creators.set(id, u.name);
    }),
  );

  const subscriptionsWithPayments = subs.map((sub) => {
    const subPayments = pays.filter((p) => p.subscriptionId === sub.id);
    const balance = computeSubscriptionBalance(
      sub.priceAtPurchase,
      sub.paidTotal,
      sub.writtenOffAmount,
    );
    return {
      id: sub.id,
      startDate: sub.startDate.toDate(),
      endDate: sub.endDate.toDate(),
      createdAt: sub.createdAt.toDate(),
      priceAtPurchase: sub.priceAtPurchase,
      writtenOffAmount: sub.writtenOffAmount,
      package: { name: sub.packageName },
      createdBy: sub.createdById
        ? { name: creators.get(sub.createdById) ?? "—" }
        : null,
      payments: subPayments.map((p) => ({ amount: p.amount })),
      balance,
    };
  });

  const paymentsWithMeta = await Promise.all(
    pays.map(async (p) => {
      let packageName: string | null = null;
      if (p.subscriptionId) {
        const sub = subs.find((s) => s.id === p.subscriptionId);
        packageName = sub?.packageName ?? null;
      }
      let recordedByName: string | null = null;
      if (p.recordedById) {
        const u = await users.findById(platformContext, p.recordedById);
        recordedByName = u?.name ?? null;
      }
      return {
        id: p.id,
        amount: p.amount,
        method: p.method,
        paidAt: p.paidAt.toDate(),
        note: p.note,
        subscriptionId: p.subscriptionId,
        recordedBy: recordedByName ? { name: recordedByName } : null,
        subscription: packageName
          ? { package: { name: packageName } }
          : null,
      };
    }),
  );

  return {
    id: member.id,
    memberNumber: member.memberNumber,
    name: member.name,
    phone: member.phone,
    email: member.email,
    photoUrl: member.photoUrl,
    gender: member.gender,
    notes: member.notes,
    isPt: member.isPt,
    trainerId: member.trainerId,
    trainer,
    createdAt: member.createdAt.toDate(),
    membershipPolicyAgreedText: member.membershipPolicyAgreedText,
    membershipPolicyAgreedAt:
      member.membershipPolicyAgreedAt?.toDate() ?? null,
    portalEnabledAt: member.portalEnabledAt?.toDate() ?? null,
    fitnessGoal: member.fitnessGoal,
    ageYears: member.ageYears,
    heightCm: member.heightCm,
    weightKg: member.weightKg,
    pendingAmountTotal: member.pendingAmountTotal,
    subscriptions: subscriptionsWithPayments,
    payments: paymentsWithMeta,
  };
}
