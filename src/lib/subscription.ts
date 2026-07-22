import type { DurationUnit } from "@prisma/client";

export const EXPIRING_SOON_DAYS = 7;

export type SubscriptionStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NONE";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Whole days from `now` until `endDate`. Negative if already expired. */
export function daysUntil(endDate: Date | string, now: Date = new Date()): number {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endDay.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

/**
 * Derive status from an end date.
 * green ACTIVE: more than EXPIRING_SOON_DAYS away
 * amber EXPIRING_SOON: within the next EXPIRING_SOON_DAYS (inclusive of today)
 * red EXPIRED: end date is in the past
 */
export function statusFromEndDate(
  endDate: Date | string | null | undefined,
  now: Date = new Date(),
): SubscriptionStatus {
  if (!endDate) return "NONE";
  const remaining = daysUntil(endDate, now);
  if (remaining < 0) return "EXPIRED";
  if (remaining <= EXPIRING_SOON_DAYS) return "EXPIRING_SOON";
  return "ACTIVE";
}

/** Compute the end date of a subscription given a start date and a package duration. */
export function computeEndDate(
  startDate: Date,
  durationValue: number,
  durationUnit: DurationUnit,
): Date {
  const end = new Date(startDate);
  if (durationUnit === "MONTHS") {
    end.setMonth(end.getMonth() + durationValue);
  } else {
    end.setDate(end.getDate() + durationValue);
  }
  return end;
}

export function durationLabel(
  value: number,
  unit: DurationUnit,
): string {
  const noun = unit === "MONTHS" ? "month" : "day";
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  NONE: "No subscription",
};
