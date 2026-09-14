import { getRepositories, platformContext } from "@/lib/firestore";
import type { PendingMember } from "@/lib/member-list-types";
import { statusFromEndDate } from "@/lib/subscription";
import type { MemberGender } from "@prisma/client";

export const PENDING_DUES_PAGE_SIZE = 50;

export type PendingDuesPageResult = {
  rows: PendingMember[];
  matchingCount: number;
  unpaidCycleCount: number;
  totalDue: number;
  page: number;
  pageSize: number;
};

export async function getPendingDuesSummary(
  tenantGymId: string,
): Promise<{ unpaidCycleCount: number; totalDue: number }> {
  const { subscriptions } = getRepositories();
  const page = await subscriptions.listPendingCyclesPage(
    platformContext,
    tenantGymId,
    { page: 1, pageSize: 1 },
  );
  return {
    unpaidCycleCount: page.unpaidCycleCount,
    totalDue: page.totalDue,
  };
}

export async function getPendingDuesPage(
  tenantGymId: string,
  options: { page?: number; pageSize?: number; q?: string } = {},
): Promise<PendingDuesPageResult> {
  const { subscriptions } = getRepositories();
  const result = await subscriptions.listPendingCyclesPage(
    platformContext,
    tenantGymId,
    options,
  );

  const rows: PendingMember[] = result.rows.map((s) => ({
    memberId: s.memberId,
    memberNumber: s.memberNumber,
    memberName: s.memberName,
    phone: "",
    photoUrl: null,
    gender: "PREFER_NOT_TO_SAY" as MemberGender,
    subscriptionId: s.id,
    packageName: s.packageName,
    subsAmount: s.priceAtPurchase,
    paidAmount: s.paidTotal,
    amountDue: s.pendingAmount,
    endDate: s.endDate.toDate(),
    status: statusFromEndDate(s.endDate.toDate()),
  }));

  const { members } = getRepositories();
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const member = await members.findByIdAndGym(
        platformContext,
        row.memberId,
        tenantGymId,
      );
      if (!member) return row;
      return {
        ...row,
        phone: member.phone,
        photoUrl: member.photoUrl,
        gender: member.gender as MemberGender,
      };
    }),
  );

  return {
    rows: enriched,
    matchingCount: result.matchingCount,
    unpaidCycleCount: result.unpaidCycleCount,
    totalDue: result.totalDue,
    page: result.page,
    pageSize: result.pageSize,
  };
}
