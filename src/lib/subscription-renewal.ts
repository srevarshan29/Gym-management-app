import type { DurationUnit } from "@/lib/firestore/types";
import {
  computeEndDate,
  statusFromEndDate,
  type SubscriptionStatus,
} from "@/lib/subscription";

export type SubscriptionPeriod = {
  startDate: Date;
  endDate: Date;
};

export const RENEWAL_OVERLAP_ERROR =
  "This member already has a subscription covering that period. Refresh the page and try again.";

/** Half-open style at timestamps: [start, end) touch at end=start is allowed. */
export function subscriptionPeriodsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return (
    aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime()
  );
}

/** Latest end date across existing subscriptions. */
export function maxSubscriptionEndDate(
  existing: Pick<SubscriptionPeriod, "endDate">[],
): Date | null {
  if (existing.length === 0) return null;
  return existing.reduce(
    (max, sub) => (sub.endDate.getTime() > max.getTime() ? sub.endDate : max),
    existing[0]!.endDate,
  );
}

/**
 * When the member still has active/expiring coverage (calendar semantics from
 * statusFromEndDate), the next period starts at the latest existing end boundary.
 * Otherwise renewal starts now (expired / no history).
 */
export function computeRenewalStartDate(
  existing: Pick<SubscriptionPeriod, "endDate">[],
  now: Date = new Date(),
): Date {
  const maxEnd = maxSubscriptionEndDate(existing);
  if (!maxEnd) return now;
  const status = statusFromEndDate(maxEnd, now);
  if (status === "ACTIVE" || status === "EXPIRING_SOON") {
    return maxEnd;
  }
  return now;
}

export function computeRenewalPeriod(
  existing: Pick<SubscriptionPeriod, "endDate">[],
  durationValue: number,
  durationUnit: DurationUnit,
  now: Date = new Date(),
): SubscriptionPeriod {
  const startDate = computeRenewalStartDate(existing, now);
  const endDate = computeEndDate(startDate, durationValue, durationUnit);
  return { startDate, endDate };
}

export function assertRenewalDoesNotOverlap(
  existing: SubscriptionPeriod[],
  newStart: Date,
  newEnd: Date,
): void {
  for (const sub of existing) {
    if (
      subscriptionPeriodsOverlap(
        sub.startDate,
        sub.endDate,
        newStart,
        newEnd,
      )
    ) {
      throw new Error(RENEWAL_OVERLAP_ERROR);
    }
  }
}

export function membershipNeedsRenewalConfirmation(
  status: SubscriptionStatus,
): boolean {
  return status === "ACTIVE" || status === "EXPIRING_SOON";
}
