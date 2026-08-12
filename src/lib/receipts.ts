import { Prisma } from "@prisma/client";

import { withTenant } from "@/lib/db-context";
import { nextReceiptNumber } from "@/lib/gym-sequence";
import { pendingAmount } from "@/lib/subscription-balance";

export type ReceiptData = {
  id: string;
  number: number;
  createdAt: Date;
  gymName: string;
  gymAddress: string | null;
  gymPhone: string | null;
  gymLogoUrl: string | null;
  memberId: string;
  memberName: string;
  memberPhone: string;
  memberEmail: string | null;
  packageName: string | null;
  amount: number;
  amountOwed: number | null;
  balanceAfter: number | null;
  method: string;
  paidAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
};

export function formatReceiptNumber(number: number): string {
  return `RCPT-${String(number).padStart(4, "0")}`;
}

type RawReceipt = {
  id: string;
  number: number;
  createdAt: Date;
  gymName: string;
  gymAddress: string | null;
  gymPhone: string | null;
  gymLogoUrl: string | null;
  memberId: string;
  memberName: string;
  memberPhone: string;
  memberEmail: string | null;
  packageName: string | null;
  amount: Prisma.Decimal;
  amountOwed: Prisma.Decimal | null;
  balanceAfter: Prisma.Decimal | null;
  method: string;
  paidAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
};

function toReceiptData(receipt: RawReceipt): ReceiptData {
  return {
    ...receipt,
    amount: Number(receipt.amount),
    amountOwed: receipt.amountOwed != null ? Number(receipt.amountOwed) : null,
    balanceAfter:
      receipt.balanceAfter != null ? Number(receipt.balanceAfter) : null,
  };
}

/**
 * Builds and inserts an immutable receipt snapshot for a payment. Call inside
 * the same transaction that creates the Payment row, so the receipt and the
 * payment are always created together. Snapshotting the gym/member/package
 * details means past receipts stay stable even if that data changes later.
 *
 * The payment lookup is scoped to `gymId` — if the payment exists but
 * belongs to a different gym, this throws exactly as if it didn't exist,
 * so a receipt can never be created for another tenant's payment.
 */
export async function createReceiptForPayment(
  tx: Prisma.TransactionClient,
  tenantGymId: string,
  paymentId: string,
): Promise<RawReceipt> {
  const payment = await tx.payment.findFirstOrThrow({
    where: { id: paymentId, gymId: tenantGymId },
    include: {
      member: true,
      subscription: { include: { package: true } },
    },
  });

  const gymProfile = await tx.gymProfile.findUnique({
    where: { gymId: tenantGymId },
  });
  const number = await nextReceiptNumber(tx, tenantGymId);

  let amountOwed: Prisma.Decimal | null = null;
  let balanceAfter: Prisma.Decimal | null = null;

  if (payment.subscriptionId && payment.subscription) {
    const owed = Number(payment.subscription.priceAtPurchase);
    const paidAgg = await tx.payment.aggregate({
      where: {
        gymId: tenantGymId,
        subscriptionId: payment.subscriptionId,
      },
      _sum: { amount: true },
    });
    const paidTotal = Number(paidAgg._sum.amount ?? 0);
    amountOwed = new Prisma.Decimal(owed);
    balanceAfter = new Prisma.Decimal(pendingAmount(owed, paidTotal));
  }

  return tx.receipt.create({
    data: {
      gymId: tenantGymId,
      number,
      paymentId: payment.id,
      gymName: gymProfile?.name ?? "My Gym",
      gymAddress: gymProfile?.address ?? null,
      gymPhone: gymProfile?.phone ?? null,
      gymLogoUrl: gymProfile?.logoUrl ?? null,
      memberId: payment.member.id,
      memberName: payment.member.name,
      memberPhone: payment.member.phone,
      memberEmail: payment.member.email,
      packageName: payment.subscription?.package.name ?? null,
      amount: payment.amount,
      amountOwed,
      balanceAfter,
      method: payment.method,
      paidAt: payment.paidAt,
      periodStart: payment.subscription?.startDate ?? null,
      periodEnd: payment.subscription?.endDate ?? null,
    },
  });
}

/**
 * Finds the receipt for a payment within the given gym, lazily creating one
 * for payments logged before this feature existed (so old payments remain
 * downloadable too). Scoped to `gymId` so a receipt/payment belonging to
 * another tenant can never be returned.
 */
export async function getOrCreateReceiptByPayment(
  tenantGymId: string,
  paymentId: string,
): Promise<ReceiptData> {
  return withTenant(tenantGymId, async (tx) => {
    const existing = await tx.receipt.findFirst({
      where: { paymentId: paymentId, gymId: tenantGymId },
    });
    if (existing) return toReceiptData(existing);

    const created = await createReceiptForPayment(tx, tenantGymId, paymentId);
    return toReceiptData(created);
  });
}
