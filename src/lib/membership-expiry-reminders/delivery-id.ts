import type { MembershipExpiryReminderType } from "@/lib/firestore/types";

/** Stable Firestore document id for membership expiry reminder idempotency. */
export function buildMembershipExpiryDeliveryId(params: {
  gymId: string;
  memberId: string;
  subscriptionId: string;
  reminderType: MembershipExpiryReminderType;
}): string {
  return [
    params.gymId,
    params.memberId,
    params.subscriptionId,
    params.reminderType,
  ].join("__");
}
