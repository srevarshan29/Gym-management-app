export type SubscriptionBalance = {
  subsAmount: number;
  paidAmount: number;
  writtenOffAmount: number;
  pendingAmount: number;
};

/** Outstanding balance for a subscription period (floored at 0). */
export function pendingAmount(
  subsAmount: number,
  paidAmount: number,
  writtenOffAmount = 0,
): number {
  return Math.max(0, subsAmount - paidAmount - Math.max(0, writtenOffAmount));
}

export function computeSubscriptionBalance(
  subsAmount: number,
  paidAmount: number,
  writtenOffAmount = 0,
): SubscriptionBalance {
  const writtenOff = Math.max(0, writtenOffAmount);
  return {
    subsAmount,
    paidAmount,
    writtenOffAmount: writtenOff,
    pendingAmount: pendingAmount(subsAmount, paidAmount, writtenOff),
  };
}

/** Sum payment amounts from Prisma aggregate or payment rows. */
export function sumPaymentAmounts(
  payments: { amount: { toString(): string } | number }[],
): number {
  return payments.reduce((sum, p) => sum + Number(p.amount), 0);
}
