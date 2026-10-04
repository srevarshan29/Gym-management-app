import type { MemberDoc } from "@/lib/firestore/types";
import {
  statusFromEndDate,
  daysUntil,
  type SubscriptionStatus,
} from "@/lib/subscription";

import type { ManualRenewalReminderVariant } from "./types";

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

const VARIANT_STATUS: Record<
  ManualRenewalReminderVariant,
  SubscriptionStatus
> = {
  expired: "EXPIRED",
  upcoming: "EXPIRING_SOON",
};

export type ManualRenewalEligibility =
  | "eligible"
  | "skipped_no_email"
  | "skipped_not_in_bucket"
  | "skipped_stale_subscription";

export function assessManualRenewalReminderEligibility(
  member: MemberDoc,
  variant: ManualRenewalReminderVariant,
  expectedEndDate: Date | null,
  now: Date = new Date(),
): ManualRenewalEligibility {
  const endDate = member.currentEndDate?.toDate() ?? null;
  const status = statusFromEndDate(endDate, now);

  if (status !== VARIANT_STATUS[variant]) {
    return "skipped_not_in_bucket";
  }

  if (
    expectedEndDate &&
    endDate &&
    !sameCalendarDay(endDate, expectedEndDate)
  ) {
    return "skipped_stale_subscription";
  }

  if (!member.currentSubscriptionId) {
    return "skipped_not_in_bucket";
  }

  const email = member.email?.trim();
  if (!email) {
    return "skipped_no_email";
  }

  return "eligible";
}

export function daysRemainingForManualReminder(
  endDate: Date,
  now: Date = new Date(),
): number {
  return daysUntil(endDate, now);
}
