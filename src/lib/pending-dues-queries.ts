import type { MemberGender } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import type { PendingMember } from "@/lib/queries";
import { statusFromEndDate } from "@/lib/subscription";

export const PENDING_DUES_PAGE_SIZE = 50;

export type PendingDuesPageResult = {
  rows: PendingMember[];
  matchingCount: number;
  unpaidCycleCount: number;
  totalDue: number;
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

type CycleRow = {
  subscriptionId: string;
  memberId: string;
  memberNumber: number;
  memberName: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  packageName: string;
  endDate: Date;
  subsAmount: number;
  paidAmount: number;
  amountDue: number;
};

function nameFilterSql(pattern: string | null) {
  if (!pattern) return Prisma.sql``;
  return Prisma.sql`AND m.name ILIKE ${pattern} ESCAPE '\\'`;
}

export async function getPendingDuesSummary(
  tenantGymId: string,
): Promise<{ unpaidCycleCount: number; totalDue: number }> {
  return withTenant(tenantGymId, async (tx) => {
    const summaryRows = await tx.$queryRaw<
      { unpaid_cycle_count: number; total_due: number }[]
    >`
      WITH paid AS (
        SELECT "subscriptionId" AS id, SUM(amount) AS paid_amount
        FROM "Payment"
        WHERE "gymId" = ${tenantGymId}
          AND "subscriptionId" IS NOT NULL
        GROUP BY "subscriptionId"
      ),
      cycle AS (
        SELECT
          GREATEST(
            0,
            s."priceAtPurchase"
              - COALESCE(p.paid_amount, 0)
              - COALESCE(s."writtenOffAmount", 0)
          ) AS pending
        FROM "Subscription" s
        LEFT JOIN paid p ON p.id = s.id
        WHERE s."gymId" = ${tenantGymId}
      )
      SELECT
        COUNT(*) FILTER (WHERE pending > 0)::int AS unpaid_cycle_count,
        COALESCE(SUM(pending) FILTER (WHERE pending > 0), 0)::float AS total_due
      FROM cycle
    `;
    const summary = summaryRows[0];
    return {
      unpaidCycleCount: summary?.unpaid_cycle_count ?? 0,
      totalDue: Number(summary?.total_due ?? 0),
    };
  });
}

export async function getPendingDuesPage(
  tenantGymId: string,
  options: { page?: number; pageSize?: number; q?: string } = {},
): Promise<PendingDuesPageResult> {
  const pageSize = options.pageSize ?? PENDING_DUES_PAGE_SIZE;
  const page = parsePage(options.page ?? 1);
  const pattern = ilikePattern(options.q ?? "");
  const offset = (page - 1) * pageSize;
  const nameFilter = nameFilterSql(pattern);

  return withTenant(tenantGymId, async (tx) => {
    const [summaryRows, matchingRows, cycleRows] = await Promise.all([
      tx.$queryRaw<{ unpaid_cycle_count: number; total_due: number }[]>`
        WITH paid AS (
          SELECT "subscriptionId" AS id, SUM(amount) AS paid_amount
          FROM "Payment"
          WHERE "gymId" = ${tenantGymId}
            AND "subscriptionId" IS NOT NULL
          GROUP BY "subscriptionId"
        ),
        cycle AS (
          SELECT
            GREATEST(
              0,
              s."priceAtPurchase"
                - COALESCE(p.paid_amount, 0)
                - COALESCE(s."writtenOffAmount", 0)
            ) AS pending
          FROM "Subscription" s
          LEFT JOIN paid p ON p.id = s.id
          WHERE s."gymId" = ${tenantGymId}
        )
        SELECT
          COUNT(*) FILTER (WHERE pending > 0)::int AS unpaid_cycle_count,
          COALESCE(SUM(pending) FILTER (WHERE pending > 0), 0)::float AS total_due
        FROM cycle
      `,
      pattern
        ? tx.$queryRaw<{ matching_count: number }[]>`
            WITH paid AS (
              SELECT "subscriptionId" AS id, SUM(amount) AS paid_amount
              FROM "Payment"
              WHERE "gymId" = ${tenantGymId}
                AND "subscriptionId" IS NOT NULL
              GROUP BY "subscriptionId"
            ),
            cycle AS (
              SELECT
                GREATEST(
                  0,
                  s."priceAtPurchase"
                    - COALESCE(p.paid_amount, 0)
                    - COALESCE(s."writtenOffAmount", 0)
                ) AS pending
              FROM "Subscription" s
              JOIN "Member" m ON m.id = s."memberId" AND m."gymId" = ${tenantGymId}
              LEFT JOIN paid p ON p.id = s.id
              WHERE s."gymId" = ${tenantGymId}
              ${nameFilter}
            )
            SELECT COUNT(*) FILTER (WHERE pending > 0)::int AS matching_count
            FROM cycle
          `
        : Promise.resolve([{ matching_count: -1 }]),
      tx.$queryRaw<CycleRow[]>`
        WITH paid AS (
          SELECT "subscriptionId" AS id, SUM(amount) AS paid_amount
          FROM "Payment"
          WHERE "gymId" = ${tenantGymId}
            AND "subscriptionId" IS NOT NULL
          GROUP BY "subscriptionId"
        )
        SELECT
          s.id AS "subscriptionId",
          m.id AS "memberId",
          m."memberNumber",
          m.name AS "memberName",
          m.phone,
          m."photoUrl",
          m.gender,
          pkg.name AS "packageName",
          s."endDate",
          s."priceAtPurchase"::float AS "subsAmount",
          COALESCE(p.paid_amount, 0)::float AS "paidAmount",
          GREATEST(
            0,
            s."priceAtPurchase"
              - COALESCE(p.paid_amount, 0)
              - COALESCE(s."writtenOffAmount", 0)
          )::float AS "amountDue"
        FROM "Subscription" s
        JOIN "Member" m ON m.id = s."memberId" AND m."gymId" = ${tenantGymId}
        JOIN "Package" pkg ON pkg.id = s."packageId" AND pkg."gymId" = ${tenantGymId}
        LEFT JOIN paid p ON p.id = s.id
        WHERE s."gymId" = ${tenantGymId}
          ${nameFilter}
          AND GREATEST(
            0,
            s."priceAtPurchase"
              - COALESCE(p.paid_amount, 0)
              - COALESCE(s."writtenOffAmount", 0)
          ) > 0
        ORDER BY "amountDue" DESC, s.id DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
    ]);

    const summary = summaryRows[0];
    const unpaidCycleCount = summary?.unpaid_cycle_count ?? 0;
    const totalDue = Number(summary?.total_due ?? 0);
    const matchingCount =
      pattern == null
        ? unpaidCycleCount
        : (matchingRows[0]?.matching_count ?? 0);

    const rows: PendingMember[] = cycleRows.map((row) => ({
      memberId: row.memberId,
      memberNumber: row.memberNumber,
      memberName: row.memberName,
      phone: row.phone,
      photoUrl: row.photoUrl,
      gender: row.gender,
      subscriptionId: row.subscriptionId,
      packageName: row.packageName,
      subsAmount: Number(row.subsAmount),
      paidAmount: Number(row.paidAmount),
      amountDue: Number(row.amountDue),
      endDate: row.endDate,
      status: statusFromEndDate(row.endDate),
    }));

    return {
      rows,
      matchingCount,
      unpaidCycleCount,
      totalDue,
      page,
      pageSize,
    };
  });
}
