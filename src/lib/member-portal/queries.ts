import { getRepositories, platformContext } from "@/lib/firestore";
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
  const { members, subscriptions, payments } = getRepositories();

  const member = await members.findByIdAndGym(
    platformContext,
    memberId,
    tenantGymId,
  );
  if (!member) return null;

  const subs = await subscriptions.listByMember(
    platformContext,
    tenantGymId,
    memberId,
  );
  const pays = await payments.listByMember(
    platformContext,
    tenantGymId,
    memberId,
  );

  const sorted = [...subs].sort(
    (a, b) => b.endDate.toMillis() - a.endDate.toMillis(),
  );
  const current = sorted[0];
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

  const endDay = normalizeDay(current.endDate.toDate());
  const today = normalizeDay(new Date());
  const daysRemaining = Math.ceil(
    (endDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const planTotalDays = inclusiveDayCount(
    current.startDate.toDate(),
    current.endDate.toDate(),
  );

  const currentPayments = pays.filter((p) => p.subscriptionId === current.id);
  const currentBalance = computeSubscriptionBalance(
    current.priceAtPurchase,
    sumPaymentAmounts(currentPayments.map((p) => ({ amount: p.amount }))),
    current.writtenOffAmount,
  );

  const pendingAmount = subs.reduce((sum, sub) => {
    const subPayments = pays.filter((p) => p.subscriptionId === sub.id);
    return (
      sum +
      computeSubscriptionBalance(
        sub.priceAtPurchase,
        sumPaymentAmounts(subPayments.map((p) => ({ amount: p.amount }))),
        sub.writtenOffAmount,
      ).pendingAmount
    );
  }, 0);

  return {
    memberName: member.name,
    memberNumber: member.memberNumber,
    packageName: current.packageName,
    status: statusFromEndDate(current.endDate.toDate()),
    daysRemaining,
    planTotalDays,
    paidAmount: currentBalance.paidAmount,
    pendingAmount,
    endDate: current.endDate.toDate(),
  };
}

export async function getMemberPortalPayments(
  tenantGymId: string,
  memberId: string,
) {
  const { payments, subscriptions } = getRepositories();
  const pays = await payments.listByMember(
    platformContext,
    tenantGymId,
    memberId,
  );
  const subs = await subscriptions.listByMember(
    platformContext,
    tenantGymId,
    memberId,
  );
  const subById = new Map(subs.map((s) => [s.id, s]));

  return pays.map((p) => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    paidAt: p.paidAt.toDate(),
    subscription: p.subscriptionId
      ? {
          package: {
            name: subById.get(p.subscriptionId)?.packageName ?? "—",
          },
        }
      : null,
  }));
}

export async function getMemberPortalDietPlan(
  tenantGymId: string,
  memberId: string,
) {
  const { dietPlans } = getRepositories();
  const plan = await dietPlans.findByMemberId(
    platformContext,
    tenantGymId,
    memberId,
  );
  if (!plan) return null;
  return {
    title: plan.title,
    caloriesPerDay: plan.caloriesPerDay,
    mealPlan: plan.mealPlan,
    updatedAt: plan.updatedAt.toDate(),
  };
}

export async function getMemberPortalWorkoutPlan(
  tenantGymId: string,
  memberId: string,
) {
  const { workoutPlans } = getRepositories();
  const plan = await workoutPlans.findByMemberId(
    platformContext,
    tenantGymId,
    memberId,
  );
  if (!plan) return null;
  return {
    title: plan.title,
    level: plan.level,
    weeklySchedule: plan.weeklySchedule,
    updatedAt: plan.updatedAt.toDate(),
  };
}

export async function getMemberPortalEvents(tenantGymId: string) {
  const { events } = getRepositories();
  const rows = await events.listForPortal(platformContext, tenantGymId);
  return rows.map((event) => ({
    id: event.id,
    title: event.title,
    eventDate: event.eventDate.toDate(),
    location: event.location,
    description: event.description,
  }));
}
