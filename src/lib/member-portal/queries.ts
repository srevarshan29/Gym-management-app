import { prisma } from "@/lib/prisma";
import {
  computeSubscriptionBalance,
  sumPaymentAmounts,
} from "@/lib/subscription-balance";
import { statusFromEndDate } from "@/lib/subscription";

export async function getMemberPortalOverview(gymId: string, memberId: string) {
  const member = await prisma.member.findFirst({
    where: { id: memberId, gymId },
    select: {
      name: true,
      memberNumber: true,
      subscriptions: {
        orderBy: { endDate: "desc" },
        take: 1,
        select: {
          endDate: true,
          startDate: true,
          priceAtPurchase: true,
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
      packageName: null as string | null,
      status: "NONE" as const,
      daysRemaining: null as number | null,
      pendingAmount: null as number | null,
    };
  }

  const end = new Date(current.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  const daysRemaining = Math.ceil(
    (endDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  const balance = computeSubscriptionBalance(
    Number(current.priceAtPurchase),
    sumPaymentAmounts(current.payments),
  );

  return {
    memberName: member.name,
    memberNumber: member.memberNumber,
    packageName: current.package.name,
    status: statusFromEndDate(current.endDate),
    daysRemaining,
    pendingAmount: balance.pendingAmount,
  };
}

export async function getMemberPortalPayments(gymId: string, memberId: string) {
  return prisma.payment.findMany({
    where: { gymId, memberId },
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

export async function getMemberPortalDietPlan(gymId: string, memberId: string) {
  return prisma.dietPlan.findFirst({
    where: { gymId, memberId },
    select: {
      title: true,
      caloriesPerDay: true,
      mealPlan: true,
      updatedAt: true,
    },
  });
}

export async function getMemberPortalWorkoutPlan(
  gymId: string,
  memberId: string,
) {
  return prisma.workoutPlan.findFirst({
    where: { gymId, memberId },
    select: {
      title: true,
      level: true,
      weeklySchedule: true,
      updatedAt: true,
    },
  });
}

export async function getMemberPortalEvents(gymId: string) {
  const rows = await prisma.gymEvent.findMany({
    where: { gymId },
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
