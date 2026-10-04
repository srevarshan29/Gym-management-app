import { daysUntil } from "@/lib/subscription";

import type { ExpiryReminderCandidate, ExpiryReminderDaysUntil } from "./types";

/** Calendar-day range [start, end) for members whose membership ends on the target day. */
export function expiryCalendarDayRange(
  daysUntilExpiry: ExpiryReminderDaysUntil,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const targetDay = new Date(startOfToday);
  targetDay.setDate(targetDay.getDate() + daysUntilExpiry);
  const end = new Date(targetDay);
  end.setDate(end.getDate() + 1);
  return { start: targetDay, end };
}

export function isEligibleForExpiryReminder(
  candidate: ExpiryReminderCandidate,
  daysUntilTarget: ExpiryReminderDaysUntil,
  now: Date = new Date(),
): boolean {
  if (!candidate.currentEndDate || !candidate.currentSubscriptionId) {
    return false;
  }
  if (!candidate.memberEmail?.trim()) {
    return false;
  }
  return daysUntil(candidate.currentEndDate, now) === daysUntilTarget;
}
