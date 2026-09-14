import { pendingAmount } from "@/lib/subscription-balance";

/** Recompute subscription paid/pending fields after a payment or write-off. */
export function computeSubscriptionPendingFields(
  priceAtPurchase: number,
  paidTotal: number,
  writtenOffAmount: number,
): { paidTotal: number; pendingAmount: number } {
  return {
    paidTotal,
    pendingAmount: pendingAmount(priceAtPurchase, paidTotal, writtenOffAmount),
  };
}

/** Apply a delta to member pendingAmountTotal (may be negative on write-off). */
export function adjustMemberPendingTotal(
  currentTotal: number,
  delta: number,
): number {
  return Math.max(0, currentTotal + delta);
}
