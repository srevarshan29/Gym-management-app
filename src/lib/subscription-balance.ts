export type SubscriptionBalance = {
  subsAmount: number;
  paidAmount: number;
  pendingAmount: number;
};

/** Outstanding balance for a subscription period (floored at 0). */
export function pendingAmount(subsAmount: number, paidAmount: number): number {
  return Math.max(0, subsAmount - paidAmount);
}

export function computeSubscriptionBalance(
  subsAmount: number,
  paidAmount: number,
): SubscriptionBalance {
  return {
    subsAmount,
    paidAmount,
    pendingAmount: pendingAmount(subsAmount, paidAmount),
  };
}

/** Sum payment amounts from Prisma aggregate or payment rows. */
export function sumPaymentAmounts(
  payments: { amount: { toString(): string } | number }[],
): number {
  return payments.reduce((sum, p) => sum + Number(p.amount), 0);
}
