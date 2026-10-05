import { isMembershipActiveForAttendance } from "@/lib/attendance/membership-active";
import type { MemberDoc } from "@/lib/firestore/types";
import { computeCalendarDaysRemaining } from "@/lib/notification-settings/template-variables";
import type { InactiveMemberAfterDays } from "@/lib/notification-settings/types";

import type { InactiveMemberEligibility } from "./types";

export function daysSinceLastAttendance(
  lastAttendanceAt: Date,
  now: Date = new Date(),
): number {
  return computeCalendarDaysRemaining(now, lastAttendanceAt);
}

export function assessInactiveMemberEligibility(
  member: Pick<
    MemberDoc,
    | "gymId"
    | "email"
    | "currentEndDate"
    | "currentSubscriptionId"
    | "lastAttendanceAt"
  >,
  gymId: string,
  inactiveAfterDays: InactiveMemberAfterDays,
  now: Date = new Date(),
): InactiveMemberEligibility {
  if (member.gymId !== gymId) {
    return "skipped_wrong_gym";
  }

  if (!member.currentSubscriptionId) {
    return "skipped_not_active";
  }

  const endDate = member.currentEndDate?.toDate() ?? null;
  if (!isMembershipActiveForAttendance(endDate, now)) {
    return "skipped_not_active";
  }

  const email = member.email?.trim();
  if (!email) {
    return "skipped_no_email";
  }

  const lastAt = member.lastAttendanceAt?.toDate() ?? null;
  if (!lastAt) {
    return "skipped_no_attendance";
  }

  const daysInactive = daysSinceLastAttendance(lastAt, now);
  if (daysInactive < inactiveAfterDays) {
    return "skipped_not_inactive_enough";
  }

  return "eligible";
}
