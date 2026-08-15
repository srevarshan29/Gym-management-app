import type { MemberGender } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import type { MemberListItem } from "@/lib/queries";
import { statusFromEndDate } from "@/lib/subscription";

export const MEMBERS_DIRECTORY_PAGE_SIZE = 50;

export type MembersDirectoryPageResult = {
  rows: MemberListItem[];
  totalMembers: number;
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

/** Matches the Members directory client search: name, phone, member #. */
function memberSearchSql(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return Prisma.sql``;

  let numberQuery = trimmed.toLowerCase();
  if (numberQuery.startsWith("#")) numberQuery = numberQuery.slice(1).trim();

  const namePhonePat = ilikePattern(trimmed);
  const numberPat = ilikePattern(numberQuery);
  if (!namePhonePat) return Prisma.sql``;

  const clauses: Prisma.Sql[] = [
    Prisma.sql`m.name ILIKE ${namePhonePat} ESCAPE '\\'`,
    Prisma.sql`m.phone ILIKE ${namePhonePat} ESCAPE '\\'`,
  ];

  if (numberPat) {
    clauses.push(
      Prisma.sql`lpad(m."memberNumber"::text, 4, '0') ILIKE ${numberPat} ESCAPE '\\'`,
    );
    clauses.push(
      Prisma.sql`m."memberNumber"::text ILIKE ${numberPat} ESCAPE '\\'`,
    );
  }

  const digits = numberQuery.replace(/\D/g, "");
  if (digits.length > 0) {
    const digitPat = `%${digits.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    clauses.push(
      Prisma.sql`regexp_replace(m.phone, '\\D', '', 'g') LIKE ${digitPat} ESCAPE '\\'`,
    );
    clauses.push(
      Prisma.sql`lpad(m."memberNumber"::text, 4, '0') LIKE ${digitPat} ESCAPE '\\'`,
    );
  }

  return Prisma.sql`AND (${Prisma.join(clauses, " OR ")})`;
}

type DirectoryRow = {
  id: string;
  memberNumber: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  createdAt: Date;
  isPt: boolean;
  trainerId: string | null;
  packageName: string | null;
  currentSubscriptionId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  pendingAmount: number;
  addedByName: string | null;
};

export async function getMembersDirectoryPage(
  tenantGymId: string,
  options: { page?: number; pageSize?: number; q?: string } = {},
): Promise<MembersDirectoryPageResult> {
  const pageSize = options.pageSize ?? MEMBERS_DIRECTORY_PAGE_SIZE;
  const page = parsePage(options.page ?? 1);
  const q = options.q ?? "";
  const search = memberSearchSql(q);
  const offset = (page - 1) * pageSize;

  return withTenant(tenantGymId, async (tx) => {
    const [totalRows, matchingRows, rows] = await Promise.all([
      tx.$queryRaw<{ n: number }[]>`
        SELECT COUNT(*)::int AS n
        FROM "Member" m
        WHERE m."gymId" = ${tenantGymId}
      `,
      tx.$queryRaw<{ n: number }[]>`
        SELECT COUNT(*)::int AS n
        FROM "Member" m
        WHERE m."gymId" = ${tenantGymId}
        ${search}
      `,
      tx.$queryRaw<DirectoryRow[]>`
        WITH filtered AS (
          SELECT m.*
          FROM "Member" m
          WHERE m."gymId" = ${tenantGymId}
          ${search}
          ORDER BY m."createdAt" DESC, m.id DESC
          LIMIT ${pageSize} OFFSET ${offset}
        ),
        current_sub AS (
          SELECT DISTINCT ON (s."memberId")
            s."memberId",
            s.id,
            s."startDate",
            s."endDate",
            s."packageId"
          FROM "Subscription" s
          INNER JOIN filtered f ON f.id = s."memberId"
          WHERE s."gymId" = ${tenantGymId}
          ORDER BY s."memberId", s."endDate" DESC, s."createdAt" DESC
        ),
        first_sub AS (
          SELECT DISTINCT ON (s."memberId")
            s."memberId",
            s."createdById"
          FROM "Subscription" s
          INNER JOIN filtered f ON f.id = s."memberId"
          WHERE s."gymId" = ${tenantGymId}
          ORDER BY s."memberId", s."createdAt" ASC
        ),
        paid AS (
          SELECT p."subscriptionId" AS id, SUM(p.amount) AS paid_amount
          FROM "Payment" p
          INNER JOIN "Subscription" s
            ON s.id = p."subscriptionId" AND s."gymId" = ${tenantGymId}
          INNER JOIN filtered f ON f.id = s."memberId"
          WHERE p."gymId" = ${tenantGymId}
            AND p."subscriptionId" IS NOT NULL
          GROUP BY p."subscriptionId"
        ),
        pending AS (
          SELECT
            s."memberId",
            COALESCE(
              SUM(
                GREATEST(
                  0,
                  s."priceAtPurchase"
                    - COALESCE(p.paid_amount, 0)
                    - COALESCE(s."writtenOffAmount", 0)
                )
              ),
              0
            ) AS pending_amount
          FROM "Subscription" s
          INNER JOIN filtered f ON f.id = s."memberId"
          LEFT JOIN paid p ON p.id = s.id
          WHERE s."gymId" = ${tenantGymId}
          GROUP BY s."memberId"
        )
        SELECT
          f.id,
          f."memberNumber",
          f.name,
          f.phone,
          f."photoUrl",
          f.gender,
          f."createdAt",
          f."isPt",
          f."trainerId",
          pkg.name AS "packageName",
          cs.id AS "currentSubscriptionId",
          cs."startDate",
          cs."endDate",
          COALESCE(pend.pending_amount, 0)::float AS "pendingAmount",
          u.name AS "addedByName"
        FROM filtered f
        LEFT JOIN current_sub cs ON cs."memberId" = f.id
        LEFT JOIN "Package" pkg
          ON pkg.id = cs."packageId" AND pkg."gymId" = ${tenantGymId}
        LEFT JOIN first_sub fs ON fs."memberId" = f.id
        LEFT JOIN "User" u
          ON u.id = fs."createdById" AND u."gymId" = ${tenantGymId}
        LEFT JOIN pending pend ON pend."memberId" = f.id
        ORDER BY f."createdAt" DESC, f.id DESC
      `,
    ]);

    return {
      rows: rows.map((row) => ({
        id: row.id,
        memberNumber: row.memberNumber,
        name: row.name,
        phone: row.phone,
        photoUrl: row.photoUrl,
        gender: row.gender,
        createdAt: row.createdAt,
        packageName: row.packageName,
        currentSubscriptionId: row.currentSubscriptionId,
        startDate: row.startDate,
        endDate: row.endDate,
        status: statusFromEndDate(row.endDate),
        subsAmount: null,
        paidAmount: null,
        pendingAmount: Number(row.pendingAmount ?? 0),
        addedByName: row.addedByName,
        isPt: row.isPt,
        trainerId: row.trainerId,
        trainerName: null,
      })),
      totalMembers: totalRows[0]?.n ?? 0,
      matchingCount: matchingRows[0]?.n ?? 0,
      page,
      pageSize,
    };
  });
}
