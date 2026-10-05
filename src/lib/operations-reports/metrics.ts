import type { AttendanceListItem } from "@/lib/attendance/types";
import type { PaymentMethod } from "@/lib/firestore/types";
import { statusFromEndDate } from "@/lib/subscription";

export type AttendanceReportSummary = {
  totalCheckIns: number;
  uniqueMembers: number;
  averageCheckInsPerActiveMember: number;
};

export function computeAttendanceSummary(
  rows: Pick<AttendanceListItem, "memberId">[],
): AttendanceReportSummary {
  const totalCheckIns = rows.length;
  const uniqueMembers = new Set(rows.map((r) => r.memberId)).size;
  const averageCheckInsPerActiveMember =
    uniqueMembers > 0 ? totalCheckIns / uniqueMembers : 0;
  return {
    totalCheckIns,
    uniqueMembers,
    averageCheckInsPerActiveMember,
  };
}

export type SubscriptionRowForReport = {
  id: string;
  memberId: string;
  memberName: string;
  memberNumber: number;
  packageName: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
};

export type MemberRowForReport = {
  id: string;
  memberNumber: number;
  name: string;
  createdAt: Date;
  endDate: Date | null;
};

export type MemberReportMetrics = {
  newMembers: number;
  activeMembers: number;
  expiringDuringPeriod: number;
  renewalsDuringPeriod: number;
};

export function computeMemberReportMetrics(
  members: MemberRowForReport[],
  subscriptions: SubscriptionRowForReport[],
  range: { startInstant: Date; endInstant: Date; asOfInstant: Date },
): MemberReportMetrics {
  const earliestStartByMember = new Map<string, Date>();
  for (const sub of subscriptions) {
    const existing = earliestStartByMember.get(sub.memberId);
    if (!existing || sub.startDate < existing) {
      earliestStartByMember.set(sub.memberId, sub.startDate);
    }
  }

  let newMembers = 0;
  for (const start of earliestStartByMember.values()) {
    if (start >= range.startInstant && start < range.endInstant) {
      newMembers += 1;
    }
  }

  let activeMembers = 0;
  for (const member of members) {
    const status = statusFromEndDate(member.endDate, range.asOfInstant);
    if (status === "ACTIVE" || status === "EXPIRING_SOON") {
      activeMembers += 1;
    }
  }

  let expiringDuringPeriod = 0;
  for (const member of members) {
    if (!member.endDate) continue;
    if (
      member.endDate >= range.startInstant &&
      member.endDate < range.endInstant
    ) {
      expiringDuringPeriod += 1;
    }
  }

  let renewalsDuringPeriod = 0;
  const subsByMember = new Map<string, SubscriptionRowForReport[]>();
  for (const sub of subscriptions) {
    const list = subsByMember.get(sub.memberId) ?? [];
    list.push(sub);
    subsByMember.set(sub.memberId, list);
  }

  for (const subs of subsByMember.values()) {
    subs.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    for (let i = 1; i < subs.length; i++) {
      const sub = subs[i]!;
      if (sub.createdAt >= range.startInstant && sub.createdAt < range.endInstant) {
        renewalsDuringPeriod += 1;
      }
    }
  }

  return {
    newMembers,
    activeMembers,
    expiringDuringPeriod,
    renewalsDuringPeriod,
  };
}

export type PaymentRowForReport = {
  amount: number;
  method: PaymentMethod;
};

export type PaymentReportMetrics = {
  totalCollected: number;
  paymentCount: number;
  averagePayment: number;
  byMethod: { method: PaymentMethod; count: number; total: number }[];
};

export function computePaymentReportMetrics(
  payments: PaymentRowForReport[],
): PaymentReportMetrics {
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const paymentCount = payments.length;
  const averagePayment = paymentCount > 0 ? totalCollected / paymentCount : 0;

  const methodMap = new Map<PaymentMethod, { count: number; total: number }>();
  for (const p of payments) {
    const bucket = methodMap.get(p.method) ?? { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += p.amount;
    methodMap.set(p.method, bucket);
  }

  const byMethod = [...methodMap.entries()]
    .map(([method, stats]) => ({ method, ...stats }))
    .sort((a, b) => b.total - a.total);

  return {
    totalCollected,
    paymentCount,
    averagePayment,
    byMethod,
  };
}

export type SubscriptionReportMetrics = {
  newSubscriptions: number;
  renewedSubscriptions: number;
  activeMemberships: number;
  expiredMemberships: number;
};

export function computeSubscriptionReportMetrics(
  subscriptions: SubscriptionRowForReport[],
  members: MemberRowForReport[],
  range: { startInstant: Date; endInstant: Date; asOfInstant: Date },
): SubscriptionReportMetrics {
  const memberMetrics = computeMemberReportMetrics(members, subscriptions, range);

  let newSubscriptions = 0;
  const earliestStartByMember = new Map<string, Date>();
  for (const sub of subscriptions) {
    const existing = earliestStartByMember.get(sub.memberId);
    if (!existing || sub.startDate < existing) {
      earliestStartByMember.set(sub.memberId, sub.startDate);
    }
  }

  for (const sub of subscriptions) {
    const earliest = earliestStartByMember.get(sub.memberId);
    if (!earliest) continue;
    if (earliest.getTime() !== sub.startDate.getTime()) continue;
    if (sub.createdAt >= range.startInstant && sub.createdAt < range.endInstant) {
      newSubscriptions += 1;
    }
  }

  let activeMemberships = 0;
  let expiredMemberships = 0;
  for (const member of members) {
    const status = statusFromEndDate(member.endDate, range.asOfInstant);
    if (status === "ACTIVE" || status === "EXPIRING_SOON") {
      activeMemberships += 1;
    } else if (status === "EXPIRED") {
      expiredMemberships += 1;
    }
  }

  return {
    newSubscriptions,
    renewedSubscriptions: memberMetrics.renewalsDuringPeriod,
    activeMemberships,
    expiredMemberships,
  };
}
