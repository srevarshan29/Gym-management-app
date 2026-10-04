import type { MembershipExpiryReminderType } from "@/lib/firestore/types";

export type ExpiryReminderDays = 7 | 3;

export type ExpiryReminderCandidate = {
  gymId: string;
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  currentSubscriptionId: string | null;
  currentEndDate: Date | null;
};

export type ExpiryReminderDeliveryRecord = {
  gymId: string;
  memberId: string;
  subscriptionId: string;
  reminderType: MembershipExpiryReminderType;
  recipientEmail: string;
};

export function reminderTypeForDays(
  days: ExpiryReminderDays,
): MembershipExpiryReminderType {
  return days === 7 ? "EXPIRY_7_DAY" : "EXPIRY_3_DAY";
}
