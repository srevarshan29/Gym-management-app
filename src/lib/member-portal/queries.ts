import { prisma } from "@/lib/prisma";
import {
  computeSubscriptionBalance,
  sumPaymentAmounts,
} from "@/lib/subscription-balance";
import { statusFromEndDate } from "@/lib/subscription";

export type MemberPortalOverview = {
  memberName: string;
  memberNumber: number;
  packageName: string | null;
  status: ReturnType<typeof statusFromEndDate>;
  daysRemaining: number | null;
  planTotalDays: number | null;
  paidAmount: number | null;
  pendingAmount: number | null;
  endDate: Date | null;
};

function normalizeDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inclusiveDayCount(start: Date, end: Date): number {
  const startDay = normalizeDay(start);
  const endDay = normalizeDay(end);
  const diff = Math.round(
    (endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, diff + 1);
}

export async function getMemberPortalOverview(
  tenantGymId: string,
  memberId: string,
): Promise<MemberPortalOverview | null> {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId: tenantGymId },
    select: {
      name: true,
      memberNumber: true,
      subscriptions: {
        orderBy: { endDate: "desc" },
        select: {
          endDate: true,
          startDate: true,
          priceAtPurchase: true,
          writtenOffAmount: true,
          package: { select: { name: true } },
          payments: { select: { amount: true } },
        },
      },
    },
  });
  if (!member) return null;

  const current = member.subscriptions[0];
  if (!current) {
    return {
      memberName: member.name,
      memberNumber: member.memberNumber,
      packageName: null,
      status: "NONE" as const,
      daysRemaining: null,
      planTotalDays: null,
      paidAmount: null,
      pendingAmount: null,
      endDate: null,
    };
  }

  const endDay = normalizeDay(current.endDate);
  const today = normalizeDay(new Date());
  const daysRemaining = Math.ceil(
    (endDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const planTotalDays = inclusiveDayCount(current.startDate, current.endDate);

  const currentBalance = computeSubscriptionBalance(
    Number(current.priceAtPurchase),
    sumPaymentAmounts(current.payments),
    Number(current.writtenOffAmount),
  );
  const pendingAmount = member.subscriptions.reduce((sum, sub) => {
    return (
      sum +
      computeSubscriptionBalance(
        Number(sub.priceAtPurchase),
        sumPaymentAmounts(sub.payments),
        Number(sub.writtenOffAmount),
      ).pendingAmount
    );
  }, 0);

  return {
    memberName: member.name,
    memberNumber: member.memberNumber,
    packageName: current.package.name,
    status: statusFromEndDate(current.endDate),
    daysRemaining,
    planTotalDays,
    paidAmount: currentBalance.paidAmount,
    pendingAmount,
    endDate: current.endDate,
  };
}

export async function getMemberPortalPayments(
  tenantGymId: string,
  memberId: string,
) {
  return prisma.payment.findMany({
    where: { gymId: tenantGymId, memberId: memberId },
    orderBy: { paidAt: "desc" },
    select: {
      id: true,
      amount: true,
      method: true,
      paidAt: true,
      subscription: {
        select: { package: { select: { name: true } } },
      },
    },
  });
}

export async function getMemberPortalDietPlan(
  tenantGymId: string,
  memberId: string,
) {
  return prisma.dietPlan.findFirst({
    where: { gymId: tenantGymId, memberId: memberId },
    select: {
      title: true,
      caloriesPerDay: true,
      mealPlan: true,
      updatedAt: true,
    },
  });
}

export async function getMemberPortalWorkoutPlan(
  tenantGymId: string,
  memberId: string,
) {
  return prisma.workoutPlan.findFirst({
    where: { gymId: tenantGymId, memberId: memberId },
    select: {
      title: true,
      level: true,
      weeklySchedule: true,
      updatedAt: true,
    },
  });
}

export async function getMemberPortalEvents(tenantGymId: string) {
  const rows = await prisma.gymEvent.findMany({
    where: { gymId: tenantGymId },
    orderBy: { eventDate: "asc" },
    select: {
      id: true,
      title: true,
      eventDate: true,
      location: true,
      description: true,
    },
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = rows.filter((r) => new Date(r.eventDate) >= today);
  const past = rows
    .filter((r) => new Date(r.eventDate) < today)
    .reverse();
  return [...upcoming, ...past];
}
