import { withTenant } from "@/lib/db-context";

export const PAYMENTS_PAGE_SIZE = 50;

export type PaidPaymentRow = {
  id: string;
  paidAt: Date;
  amount: unknown;
  method: string;
  member: { id: string; name: string };
  subscription: { package: { name: string } } | null;
  recordedBy: { name: string } | null;
};

export type PaidPaymentsPageResult = {
  rows: PaidPaymentRow[];
  matchingCount: number;
  paymentCount: number;
  totalCollected: number;
  page: number;
  pageSize: number;
};

function parsePage(page: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

function nameFilter(query: string): { name: { contains: string; mode: "insensitive" } } | undefined {
  const q = query.trim();
  if (!q) return undefined;
  return { name: { contains: q, mode: "insensitive" } };
}

/**
 * Lifetime payment total (all Payment.amount; write-offs are not payments)
 * plus a gym-scoped page of payment rows.
 */
export async function getPaidPaymentsPage(
  tenantGymId: string,
  options: { page?: number; pageSize?: number; q?: string } = {},
): Promise<PaidPaymentsPageResult> {
  const pageSize = options.pageSize ?? PAYMENTS_PAGE_SIZE;
  const page = parsePage(options.page ?? 1);
  const memberName = nameFilter(options.q ?? "");
  const offset = (page - 1) * pageSize;

  return withTenant(tenantGymId, async (tx) => {
    const where = {
      gymId: tenantGymId,
      ...(memberName ? { member: memberName } : {}),
    };

    const [agg, paymentCount, matchingCount, rows] = await Promise.all([
      tx.payment.aggregate({
        where: { gymId: tenantGymId },
        _sum: { amount: true },
      }),
      tx.payment.count({ where: { gymId: tenantGymId } }),
      memberName ? tx.payment.count({ where }) : Promise.resolve(null),
      tx.payment.findMany({
        where,
        orderBy: [{ paidAt: "desc" }, { id: "desc" }],
        take: pageSize,
        skip: offset,
        select: {
          id: true,
          paidAt: true,
          amount: true,
          method: true,
          member: { select: { id: true, name: true } },
          subscription: { select: { package: { select: { name: true } } } },
          recordedBy: { select: { name: true } },
        },
      }),
    ]);

    return {
      rows,
      matchingCount: matchingCount ?? paymentCount,
      paymentCount,
      totalCollected: Number(agg._sum.amount ?? 0),
      page,
      pageSize,
    };
  });
}
