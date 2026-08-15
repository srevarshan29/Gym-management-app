import type { MemberGender } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import { statusCutoffs } from "@/lib/dashboard-queries";
import type { MembershipRenewalRow } from "@/lib/queries";

export const MEMBERSHIP_RENEWAL_PAGE_SIZE = 50;

export type MembershipRenewalPageResult = {
  rows: MembershipRenewalRow[];
  bucketCount: number;
  matchingCount: number;
  page: number;
  pageSize: number;
};

function parsePage(page: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

function ilikePattern(query: string): string | null {
  const q = query.trim();
  if (!q) return null;
  const escaped = q
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `%${escaped}%`;
}

/** Matches MembershipRenewalList search: member name or package name. */
function nameOrPackageSearchSql(query: string) {
  const pattern = ilikePattern(query);
  if (!pattern) return Prisma.sql``;
  return Prisma.sql`AND (
    m.name ILIKE ${pattern} ESCAPE '\\'
    OR pkg.name ILIKE ${pattern} ESCAPE '\\'
  )`;
}

type ListRow = {
  id: string;
  memberNumber: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  packageName: string;
  endDate: Date;
};

function mapRows(rows: ListRow[]): MembershipRenewalRow[] {
  return rows.map((row) => ({
    id: row.id,
    memberNumber: row.memberNumber,
    name: row.name,
    phone: row.phone,
    photoUrl: row.photoUrl,
    gender: row.gender,
    packageName: row.packageName || "—",
    endDate: row.endDate,
  }));
}

export async function getUpcomingRenewalsPage(
  tenantGymId: string,
  options: { page?: number; pageSize?: number; q?: string } = {},
): Promise<MembershipRenewalPageResult> {
  const pageSize = options.pageSize ?? MEMBERSHIP_RENEWAL_PAGE_SIZE;
  const page = parsePage(options.page ?? 1);
  const search = nameOrPackageSearchSql(options.q ?? "");
  const offset = (page - 1) * pageSize;
  const cutoffs = statusCutoffs();

  return withTenant(tenantGymId, async (tx) => {
    const [bucketRows, matchingRows, rows] = await Promise.all([
      tx.$queryRaw<{ n: number }[]>`
        WITH current_sub AS (
          SELECT DISTINCT ON (s."memberId")
            s."memberId", s."endDate"
          FROM "Subscription" s
          WHERE s."gymId" = ${tenantGymId}
          ORDER BY s."memberId", s."endDate" DESC, s."createdAt" DESC
        )
        SELECT COUNT(*)::int AS n
        FROM current_sub cs
        JOIN "Member" m ON m.id = cs."memberId" AND m."gymId" = ${tenantGymId}
        WHERE cs."endDate" >= ${cutoffs.startOfToday}
          AND cs."endDate" < ${cutoffs.firstActiveMidnight}
      `,
      tx.$queryRaw<{ n: number }[]>`
        WITH current_sub AS (
          SELECT DISTINCT ON (s."memberId")
            s."memberId", s."endDate", s."packageId"
          FROM "Subscription" s
          WHERE s."gymId" = ${tenantGymId}
          ORDER BY s."memberId", s."endDate" DESC, s."createdAt" DESC
        )
        SELECT COUNT(*)::int AS n
        FROM current_sub cs
        JOIN "Member" m ON m.id = cs."memberId" AND m."gymId" = ${tenantGymId}
        JOIN "Package" pkg ON pkg.id = cs."packageId" AND pkg."gymId" = ${tenantGymId}
        WHERE cs."endDate" >= ${cutoffs.startOfToday}
          AND cs."endDate" < ${cutoffs.firstActiveMidnight}
        ${search}
      `,
      tx.$queryRaw<ListRow[]>`
        WITH current_sub AS (
          SELECT DISTINCT ON (s."memberId")
            s."memberId", s."endDate", s."packageId"
          FROM "Subscription" s
          WHERE s."gymId" = ${tenantGymId}
          ORDER BY s."memberId", s."endDate" DESC, s."createdAt" DESC
        )
        SELECT
          m.id,
          m."memberNumber",
          m.name,
          m.phone,
          m."photoUrl",
          m.gender,
          COALESCE(pkg.name, '—') AS "packageName",
          cs."endDate"
        FROM current_sub cs
        JOIN "Member" m ON m.id = cs."memberId" AND m."gymId" = ${tenantGymId}
        JOIN "Package" pkg ON pkg.id = cs."packageId" AND pkg."gymId" = ${tenantGymId}
        WHERE cs."endDate" >= ${cutoffs.startOfToday}
          AND cs."endDate" < ${cutoffs.firstActiveMidnight}
        ${search}
        ORDER BY cs."endDate" ASC, m.id DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
    ]);

    return {
      rows: mapRows(rows),
      bucketCount: bucketRows[0]?.n ?? 0,
      matchingCount: matchingRows[0]?.n ?? 0,
      page,
      pageSize,
    };
  });
}

export async function getExpiredMembershipsPage(
  tenantGymId: string,
  options: { page?: number; pageSize?: number; q?: string } = {},
): Promise<MembershipRenewalPageResult> {
  const pageSize = options.pageSize ?? MEMBERSHIP_RENEWAL_PAGE_SIZE;
  const page = parsePage(options.page ?? 1);
  const search = nameOrPackageSearchSql(options.q ?? "");
  const offset = (page - 1) * pageSize;
  const cutoffs = statusCutoffs();

  return withTenant(tenantGymId, async (tx) => {
    const [bucketRows, matchingRows, rows] = await Promise.all([
      tx.$queryRaw<{ n: number }[]>`
        WITH current_sub AS (
          SELECT DISTINCT ON (s."memberId")
            s."memberId", s."endDate"
          FROM "Subscription" s
          WHERE s."gymId" = ${tenantGymId}
          ORDER BY s."memberId", s."endDate" DESC, s."createdAt" DESC
        )
        SELECT COUNT(*)::int AS n
        FROM current_sub cs
        JOIN "Member" m ON m.id = cs."memberId" AND m."gymId" = ${tenantGymId}
        WHERE cs."endDate" < ${cutoffs.startOfToday}
      `,
      tx.$queryRaw<{ n: number }[]>`
        WITH current_sub AS (
          SELECT DISTINCT ON (s."memberId")
            s."memberId", s."endDate", s."packageId"
          FROM "Subscription" s
          WHERE s."gymId" = ${tenantGymId}
          ORDER BY s."memberId", s."endDate" DESC, s."createdAt" DESC
        )
        SELECT COUNT(*)::int AS n
        FROM current_sub cs
        JOIN "Member" m ON m.id = cs."memberId" AND m."gymId" = ${tenantGymId}
        JOIN "Package" pkg ON pkg.id = cs."packageId" AND pkg."gymId" = ${tenantGymId}
        WHERE cs."endDate" < ${cutoffs.startOfToday}
        ${search}
      `,
      tx.$queryRaw<ListRow[]>`
        WITH current_sub AS (
          SELECT DISTINCT ON (s."memberId")
            s."memberId", s."endDate", s."packageId"
          FROM "Subscription" s
          WHERE s."gymId" = ${tenantGymId}
          ORDER BY s."memberId", s."endDate" DESC, s."createdAt" DESC
        )
        SELECT
          m.id,
          m."memberNumber",
          m.name,
          m.phone,
          m."photoUrl",
          m.gender,
          COALESCE(pkg.name, '—') AS "packageName",
          cs."endDate"
        FROM current_sub cs
        JOIN "Member" m ON m.id = cs."memberId" AND m."gymId" = ${tenantGymId}
        JOIN "Package" pkg ON pkg.id = cs."packageId" AND pkg."gymId" = ${tenantGymId}
        WHERE cs."endDate" < ${cutoffs.startOfToday}
        ${search}
        ORDER BY cs."endDate" DESC, m.id DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
    ]);

    return {
      rows: mapRows(rows),
      bucketCount: bucketRows[0]?.n ?? 0,
      matchingCount: matchingRows[0]?.n ?? 0,
      page,
      pageSize,
    };
  });
}
