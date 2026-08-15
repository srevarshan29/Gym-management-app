import { Prisma } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import { csvDataLine } from "@/lib/csv";
import { statusFromEndDate } from "@/lib/subscription";
import { formatCurrency, formatDate } from "@/lib/utils";

const EXPORT_BATCH_SIZE = 200;

export const MEMBER_CSV_HEADERS = [
  "Member #",
  "Name",
  "Phone",
  "Package",
  "Status",
  "Start date",
  "Expiry",
  "Pending",
  "PT",
  "Trainer",
  "Added by",
] as const;

export const PAYMENT_CSV_HEADERS = [
  "Paid date",
  "Member",
  "Package",
  "Amount",
  "Method",
  "Recorded by",
] as const;

function formatPaymentMethod(method: string): string {
  return method.replace(/_/g, " ");
}

function idList(ids: string[]) {
  return Prisma.join(ids.map((id) => Prisma.sql`${id}`));
}

async function* iterateMemberExportRows(tenantGymId: string) {
  let cursor: { createdAt: Date; id: string } | null = null;

  for (;;) {
    const members = await withTenant(tenantGymId, (tx) =>
      tx.member.findMany({
        where: {
          gymId: tenantGymId,
          ...(cursor
            ? {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: EXPORT_BATCH_SIZE,
        select: {
          id: true,
          memberNumber: true,
          name: true,
          phone: true,
          createdAt: true,
          isPt: true,
          trainer: { select: { name: true } },
        },
      }),
    );

    if (members.length === 0) return;

    const ids = members.map((m) => m.id);
    const inIds = idList(ids);

    const [currentSubs, firstSubs, pendingRows] = await withTenant(
      tenantGymId,
      async (tx) =>
        Promise.all([
          tx.$queryRaw<
            {
              memberId: string;
              startDate: Date;
              endDate: Date;
              packageName: string;
            }[]
          >`
            SELECT DISTINCT ON (s."memberId")
              s."memberId",
              s."startDate",
              s."endDate",
              pkg.name AS "packageName"
            FROM "Subscription" s
            JOIN "Package" pkg ON pkg.id = s."packageId" AND pkg."gymId" = ${tenantGymId}
            WHERE s."gymId" = ${tenantGymId}
              AND s."memberId" IN (${inIds})
            ORDER BY s."memberId", s."endDate" DESC, s."createdAt" DESC
          `,
          tx.$queryRaw<{ memberId: string; addedByName: string | null }[]>`
            SELECT DISTINCT ON (s."memberId")
              s."memberId",
              u.name AS "addedByName"
            FROM "Subscription" s
            LEFT JOIN "User" u ON u.id = s."createdById"
            WHERE s."gymId" = ${tenantGymId}
              AND s."memberId" IN (${inIds})
            ORDER BY s."memberId", s."createdAt" ASC
          `,
          tx.$queryRaw<{ memberId: string; pending: number }[]>`
            WITH paid AS (
              SELECT p."subscriptionId" AS id, SUM(p.amount) AS paid_amount
              FROM "Payment" p
              WHERE p."gymId" = ${tenantGymId}
                AND p."subscriptionId" IS NOT NULL
                AND p."memberId" IN (${inIds})
              GROUP BY p."subscriptionId"
            )
            SELECT
              s."memberId",
              COALESCE(
                SUM(
                  GREATEST(
                    0,
                    s."priceAtPurchase"
                      - COALESCE(paid.paid_amount, 0)
                      - COALESCE(s."writtenOffAmount", 0)
                  )
                ),
                0
              )::float AS pending
            FROM "Subscription" s
            LEFT JOIN paid ON paid.id = s.id
            WHERE s."gymId" = ${tenantGymId}
              AND s."memberId" IN (${inIds})
            GROUP BY s."memberId"
          `,
        ]),
    );

    const currentByMember = new Map(currentSubs.map((row) => [row.memberId, row]));
    const addedByMember = new Map(firstSubs.map((row) => [row.memberId, row.addedByName]));
    const pendingByMember = new Map(
      pendingRows.map((row) => [row.memberId, Number(row.pending)]),
    );

    for (const m of members) {
      const current = currentByMember.get(m.id);
      const pending = pendingByMember.get(m.id) ?? 0;
      yield csvDataLine([
        String(m.memberNumber).padStart(4, "0"),
        m.name,
        m.phone,
        current?.packageName ?? "",
        statusFromEndDate(current?.endDate),
        current?.startDate ? formatDate(current.startDate) : "",
        current?.endDate ? formatDate(current.endDate) : "",
        pending > 0 ? formatCurrency(pending) : "",
        m.isPt ? "Yes" : "No",
        m.trainer?.name ?? "",
        addedByMember.get(m.id) ?? "",
      ]);
    }

    if (members.length < EXPORT_BATCH_SIZE) return;
    const last = members[members.length - 1];
    cursor = { createdAt: last.createdAt, id: last.id };
  }
}

async function* iteratePaymentExportRows(tenantGymId: string) {
  let cursor: { paidAt: Date; id: string } | null = null;

  for (;;) {
    const payments = await withTenant(tenantGymId, (tx) =>
      tx.payment.findMany({
        where: {
          gymId: tenantGymId,
          ...(cursor
            ? {
                OR: [
                  { paidAt: { lt: cursor.paidAt } },
                  { paidAt: cursor.paidAt, id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ paidAt: "desc" }, { id: "desc" }],
        take: EXPORT_BATCH_SIZE,
        select: {
          id: true,
          paidAt: true,
          amount: true,
          method: true,
          member: { select: { name: true } },
          subscription: { select: { package: { select: { name: true } } } },
          recordedBy: { select: { name: true } },
        },
      }),
    );

    if (payments.length === 0) return;

    for (const p of payments) {
      yield csvDataLine([
        formatDate(p.paidAt),
        p.member.name,
        p.subscription?.package.name ?? "",
        formatCurrency(Number(p.amount)),
        formatPaymentMethod(p.method),
        p.recordedBy?.name ?? "",
      ]);
    }

    if (payments.length < EXPORT_BATCH_SIZE) return;
    const last = payments[payments.length - 1];
    cursor = { paidAt: last.paidAt, id: last.id };
  }
}

export function iterateReportCsvChunks(
  tenantGymId: string,
  moduleId: "members" | "payments",
): AsyncGenerator<string, void, unknown> {
  return moduleId === "members"
    ? iterateMemberExportRows(tenantGymId)
    : iteratePaymentExportRows(tenantGymId);
}
