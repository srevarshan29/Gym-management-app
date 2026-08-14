import { Prisma, type MemberGender } from "@prisma/client";

import { EXPIRING_SOON_DAYS } from "@/lib/subscription";
import type { MembershipRenewalRow } from "@/lib/queries";

export type WeekBucket = { start: Date; end: Date };

export type StatusCutoffs = {
  startOfToday: Date;
  firstActiveMidnight: Date;
};

export type PackageCountRow = {
  name: string;
  count: number;
};

/** Local calendar cutoffs matching `daysUntil` / `statusFromEndDate`. */
export function statusCutoffs(now = new Date()): StatusCutoffs {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const firstActiveMidnight = new Date(startOfToday);
  firstActiveMidnight.setDate(
    firstActiveMidnight.getDate() + EXPIRING_SOON_DAYS + 1,
  );
  return { startOfToday, firstActiveMidnight };
}

function weekValuesSql(buckets: WeekBucket[]) {
  return Prisma.join(
    buckets.map(
      (b, i) =>
        Prisma.sql`(${i}::int, ${b.start}::timestamptz, ${b.end}::timestamptz)`,
    ),
  );
}

type Tx = Prisma.TransactionClient;

export type DashboardStatusCounts = {
  totalMembers: number;
  activeOrExpiringCount: number;
  expiringSoonCount: number;
  expiredCount: number;
};

export async function queryDashboardStatusCounts(
  tx: Tx,
  tenantGymId: string,
  cutoffs: StatusCutoffs,
): Promise<DashboardStatusCounts> {
  const [totalMembers, statusRow] = await Promise.all([
    tx.member.count({ where: { gymId: tenantGymId } }),
    tx.$queryRaw<
      {
        active_or_expiring: number;
        expiring_soon: number;
        expired: number;
      }[]
    >`
      WITH current_sub AS (
        SELECT DISTINCT ON ("memberId") "endDate"
        FROM "Subscription"
        WHERE "gymId" = ${tenantGymId}
        ORDER BY "memberId", "endDate" DESC, "createdAt" DESC
      )
      SELECT
        COUNT(*) FILTER (
          WHERE "endDate" >= ${cutoffs.startOfToday}
        )::int AS active_or_expiring,
        COUNT(*) FILTER (
          WHERE "endDate" >= ${cutoffs.startOfToday}
            AND "endDate" < ${cutoffs.firstActiveMidnight}
        )::int AS expiring_soon,
        COUNT(*) FILTER (
          WHERE "endDate" < ${cutoffs.startOfToday}
        )::int AS expired
      FROM current_sub
    `,
  ]);

  const row = statusRow[0];
  return {
    totalMembers,
    activeOrExpiringCount: row?.active_or_expiring ?? 0,
    expiringSoonCount: row?.expiring_soon ?? 0,
    expiredCount: row?.expired ?? 0,
  };
}

export type DashboardPendingTotals = {
  pendingTotal: number;
  pendingMemberCount: number;
};

export async function queryAllCyclePendingTotals(
  tx: Tx,
  tenantGymId: string,
): Promise<DashboardPendingTotals> {
  const rows = await tx.$queryRaw<
    { pending_total: number; pending_member_count: number }[]
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
        s."memberId",
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
      COALESCE(SUM(pending), 0)::float AS pending_total,
      COUNT(DISTINCT "memberId") FILTER (WHERE pending > 0)::int AS pending_member_count
    FROM cycle
  `;
  const row = rows[0];
  return {
    pendingTotal: Number(row?.pending_total ?? 0),
    pendingMemberCount: row?.pending_member_count ?? 0,
  };
}

export type DashboardCollectionTotals = {
  collectionExpected: number;
  collectionCollected: number;
};

export async function queryCurrentCycleCollection(
  tx: Tx,
  tenantGymId: string,
): Promise<DashboardCollectionTotals> {
  const rows = await tx.$queryRaw<{ expected: number; collected: number }[]>`
    WITH current_sub AS (
      SELECT DISTINCT ON ("memberId") id, "priceAtPurchase"
      FROM "Subscription"
      WHERE "gymId" = ${tenantGymId}
      ORDER BY "memberId", "endDate" DESC, "createdAt" DESC
    ),
    paid AS (
      SELECT "subscriptionId" AS id, SUM(amount) AS paid_amount
      FROM "Payment"
      WHERE "gymId" = ${tenantGymId}
        AND "subscriptionId" IS NOT NULL
      GROUP BY "subscriptionId"
    )
    SELECT
      COALESCE(SUM(cs."priceAtPurchase"), 0)::float AS expected,
      COALESCE(SUM(COALESCE(p.paid_amount, 0)), 0)::float AS collected
    FROM current_sub cs
    LEFT JOIN paid p ON p.id = cs.id
  `;
  const row = rows[0];
  return {
    collectionExpected: Number(row?.expected ?? 0),
    collectionCollected: Number(row?.collected ?? 0),
  };
}

export async function queryPackageDistribution(
  tx: Tx,
  tenantGymId: string,
  cutoffs: StatusCutoffs,
): Promise<PackageCountRow[]> {
  const rows = await tx.$queryRaw<{ name: string; count: number }[]>`
    WITH current_sub AS (
      SELECT DISTINCT ON (s."memberId") s."packageId", s."endDate"
      FROM "Subscription" s
      WHERE s."gymId" = ${tenantGymId}
      ORDER BY s."memberId", s."endDate" DESC, s."createdAt" DESC
    )
    SELECT COALESCE(pkg.name, 'No package') AS name, COUNT(*)::int AS count
    FROM current_sub cs
    JOIN "Package" pkg ON pkg.id = cs."packageId" AND pkg."gymId" = ${tenantGymId}
    WHERE cs."endDate" >= ${cutoffs.startOfToday}
    GROUP BY pkg.name
    ORDER BY count DESC, name ASC
  `;
  return rows.map((r) => ({ name: r.name, count: r.count }));
}

type PreviewRow = {
  id: string;
  memberNumber: number;
  name: string;
  phone: string;
  photoUrl: string | null;
  gender: MemberGender;
  packageName: string;
  endDate: Date;
};

function toPreview(rows: PreviewRow[]): MembershipRenewalRow[] {
  return rows.map((r) => ({
    id: r.id,
    memberNumber: r.memberNumber,
    name: r.name,
    phone: r.phone,
    photoUrl: r.photoUrl,
    gender: r.gender,
    packageName: r.packageName || "—",
    endDate: r.endDate,
  }));
}

export async function queryUpcomingRenewalPreview(
  tx: Tx,
  tenantGymId: string,
  cutoffs: StatusCutoffs,
  limit = 5,
): Promise<MembershipRenewalRow[]> {
  const rows = await tx.$queryRaw<PreviewRow[]>`
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
    ORDER BY cs."endDate" ASC
    LIMIT ${limit}
  `;
  return toPreview(rows);
}

export async function queryExpiredMembershipPreview(
  tx: Tx,
  tenantGymId: string,
  cutoffs: StatusCutoffs,
  limit = 5,
): Promise<MembershipRenewalRow[]> {
  const rows = await tx.$queryRaw<PreviewRow[]>`
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
    ORDER BY cs."endDate" DESC
    LIMIT ${limit}
  `;
  return toPreview(rows);
}

export type MemberSparklineRow = {
  idx: number;
  newCount: number;
  activeCount: number;
  expiringCount: number;
  expiredCount: number;
};

export async function queryMemberSparklines(
  tx: Tx,
  tenantGymId: string,
  buckets: WeekBucket[],
  now: Date,
): Promise<MemberSparklineRow[]> {
  if (buckets.length === 0) return [];
  const values = weekValuesSql(buckets);
  const rows = await tx.$queryRaw<
    {
      idx: number;
      new_count: number;
      active_count: number;
      expiring_count: number;
      expired_count: number;
    }[]
  >`
    WITH current_sub AS (
      SELECT DISTINCT ON ("memberId") "endDate"
      FROM "Subscription"
      WHERE "gymId" = ${tenantGymId}
      ORDER BY "memberId", "endDate" DESC, "createdAt" DESC
    ),
    weeks(idx, start_at, end_at) AS (
      VALUES ${values}
    )
    SELECT
      w.idx,
      (
        SELECT COUNT(*)::int FROM "Member" m
        WHERE m."gymId" = ${tenantGymId}
          AND m."createdAt" >= w.start_at
          AND m."createdAt" <= w.end_at
      ) AS new_count,
      (
        SELECT COUNT(*)::int FROM current_sub cs
        WHERE cs."endDate" >= w.end_at
      ) AS active_count,
      (
        SELECT COUNT(*)::int FROM current_sub cs
        WHERE cs."endDate" > w.end_at
          AND cs."endDate" <= w.end_at + INTERVAL '7 days'
      ) AS expiring_count,
      (
        SELECT COUNT(*)::int FROM current_sub cs
        WHERE cs."endDate" >= w.start_at
          AND cs."endDate" <= w.end_at
          AND cs."endDate" < ${now}
      ) AS expired_count
    FROM weeks w
    ORDER BY w.idx
  `;
  return rows.map((r) => ({
    idx: r.idx,
    newCount: r.new_count,
    activeCount: r.active_count,
    expiringCount: r.expiring_count,
    expiredCount: r.expired_count,
  }));
}

export async function queryWeeklyPaymentCounts(
  tx: Tx,
  tenantGymId: string,
  buckets: WeekBucket[],
): Promise<number[]> {
  if (buckets.length === 0) return [];
  const values = weekValuesSql(buckets);
  const rows = await tx.$queryRaw<{ idx: number; count: number }[]>`
    WITH weeks(idx, start_at, end_at) AS (
      VALUES ${values}
    )
    SELECT
      w.idx,
      (
        SELECT COUNT(*)::int FROM "Payment" p
        WHERE p."gymId" = ${tenantGymId}
          AND p."paidAt" >= w.start_at
          AND p."paidAt" <= w.end_at
      ) AS count
    FROM weeks w
    ORDER BY w.idx
  `;
  return rows.map((r) => r.count);
}
