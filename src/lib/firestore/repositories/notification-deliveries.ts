import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type { NotificationDeliveryDoc } from "@/lib/firestore/types";
import { buildMembershipExpiryDeliveryId } from "@/lib/membership-expiry-reminders/delivery-id";
import type { ExpiryReminderDeliveryRecord } from "@/lib/membership-expiry-reminders/types";
import { buildInactiveMemberDeliveryId } from "@/lib/inactive-member-reminders/delivery-id";
import type { InactiveMemberDeliveryRecord } from "@/lib/inactive-member-reminders/types";

export class NotificationDeliveriesRepository {
  constructor(private readonly db: Firestore) {}

  private col() {
    return this.db.collection(COLLECTIONS.notificationDeliveries);
  }

  /**
   * Atomically claim a delivery slot. Returns false if this reminder was already sent.
   */
  async claimMembershipExpiryReminder(
    record: ExpiryReminderDeliveryRecord,
  ): Promise<boolean> {
    const id = buildMembershipExpiryDeliveryId({
      gymId: record.gymId,
      memberId: record.memberId,
      subscriptionId: record.subscriptionId,
      reminderType: record.reminderType,
    });
    const ref = this.col().doc(id);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return false;

      const doc: NotificationDeliveryDoc = {
        gymId: record.gymId,
        memberId: record.memberId,
        subscriptionId: record.subscriptionId,
        kind: "MEMBERSHIP_EXPIRY",
        reminderType: record.reminderType,
        channel: "EMAIL",
        recipientEmail: record.recipientEmail,
        sentAt: Timestamp.now(),
      };
      tx.set(ref, doc);
      return true;
    });
  }

  async releaseMembershipExpiryReminder(
    record: Pick<
      ExpiryReminderDeliveryRecord,
      "gymId" | "memberId" | "subscriptionId" | "reminderType"
    >,
  ): Promise<void> {
    const id = buildMembershipExpiryDeliveryId(record);
    await this.col().doc(id).delete();
  }

  async claimInactiveMemberReminder(
    record: InactiveMemberDeliveryRecord,
  ): Promise<boolean> {
    const id = buildInactiveMemberDeliveryId({
      gymId: record.gymId,
      memberId: record.memberId,
      inactiveAfterDays: record.inactiveAfterDays,
      lastAttendancePeriodMs: record.lastAttendancePeriodMs,
    });
    const ref = this.col().doc(id);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return false;

      const doc: NotificationDeliveryDoc = {
        gymId: record.gymId,
        memberId: record.memberId,
        kind: "INACTIVE_MEMBER",
        inactiveAfterDays: record.inactiveAfterDays,
        lastAttendancePeriodMs: record.lastAttendancePeriodMs,
        channel: "EMAIL",
        recipientEmail: record.recipientEmail,
        sentAt: Timestamp.now(),
      };
      tx.set(ref, doc);
      return true;
    });
  }

  async releaseInactiveMemberReminder(
    record: Pick<
      InactiveMemberDeliveryRecord,
      "gymId" | "memberId" | "inactiveAfterDays" | "lastAttendancePeriodMs"
    >,
  ): Promise<void> {
    const id = buildInactiveMemberDeliveryId(record);
    await this.col().doc(id).delete();
  }
}
