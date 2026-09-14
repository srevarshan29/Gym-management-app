import { getRepositories, platformContext } from "@/lib/firestore";
import type { MembershipRenewalRow } from "@/lib/member-list-types";
import {
  filterExpiredMemberships,
  filterUpcomingRenewals,
} from "@/lib/queries";

export const MEMBERSHIP_RENEWAL_PAGE_SIZE = 50;

export type MembershipRenewalPageResult = {
  rows: MembershipRenewalRow[];
  bucketCount: number;
  matchingCount: number;
  page: number;
  pageSize: number;
};

function paginateRows(
  rows: MembershipRenewalRow[],
  page: number,
  pageSize: number,
  q?: string,
): MembershipRenewalPageResult {
  let filtered = rows;
  const query = q?.trim().toLowerCase() ?? "";
  if (query) {
    filtered = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.packageName.toLowerCase().includes(query),
    );
  }
  const pageNum = Math.max(1, Math.floor(page));
  const offset = (pageNum - 1) * pageSize;
  return {
    rows: filtered.slice(offset, offset + pageSize),
    bucketCount: rows.length,
    matchingCount: filtered.length,
    page: pageNum,
    pageSize,
  };
}

export async function getUpcomingRenewalsPage(
  tenantGymId: string,
  options: { page?: number; pageSize?: number; q?: string } = {},
): Promise<MembershipRenewalPageResult> {
  const { members } = getRepositories();
  const all = await members.listAllWithStatus(platformContext, tenantGymId);
  const rows = filterUpcomingRenewals(all);
  return paginateRows(
    rows,
    options.page ?? 1,
    options.pageSize ?? MEMBERSHIP_RENEWAL_PAGE_SIZE,
    options.q,
  );
}

export async function getExpiredMembershipsPage(
  tenantGymId: string,
  options: { page?: number; pageSize?: number; q?: string } = {},
): Promise<MembershipRenewalPageResult> {
  const { members } = getRepositories();
  const all = await members.listAllWithStatus(platformContext, tenantGymId);
  const rows = filterExpiredMemberships(all);
  return paginateRows(
    rows,
    options.page ?? 1,
    options.pageSize ?? MEMBERSHIP_RENEWAL_PAGE_SIZE,
    options.q,
  );
}
