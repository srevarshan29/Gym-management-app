import { statusFromEndDate, type SubscriptionStatus } from "@/lib/subscription";

const ATTENDANCE_ALLOWED: SubscriptionStatus[] = ["ACTIVE", "EXPIRING_SOON"];

export function isMembershipActiveForAttendance(
  endDate: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  const status = statusFromEndDate(endDate, now);
  return ATTENDANCE_ALLOWED.includes(status);
}
