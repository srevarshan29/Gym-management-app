import { Timestamp, type Firestore } from "firebase-admin/firestore";

import { COLLECTIONS } from "@/lib/firestore/collections";
import type {
  MemberPortalInvitationStatus,
  MemberPortalInvitationTrigger,
  NotificationDeliveryDoc,
} from "@/lib/firestore/types";
import { buildMembershipExpiryDeliveryId } from "@/lib/membership-expiry-reminders/delivery-id";
import type { ExpiryReminderDeliveryRecord } from "@/lib/membership-expiry-reminders/types";
import { buildInactiveMemberDeliveryId } from "@/lib/inactive-member-reminders/delivery-id";
import type { InactiveMemberDeliveryRecord } from "@/lib/inactive-member-reminders/types";
import { buildMemberPortalAutoInviteDeliveryId } from "@/lib/member-portal-invitation/delivery-id";
import { buildMemberPortalInvitationIdempotencyKey } from "@/lib/member-portal-invitation/idempotency-key";
import {
  MAX_MEMBER_PORTAL_INVITE_ATTEMPTS,
  MEMBER_PORTAL_INVITE_LEASE_MS,
  type MemberPortalInvitationClaimResult,
} from "@/lib/member-portal-invitation/types";
import type { MemberPortalInvitationSummary } from "@/lib/member-portal-invitation/types";

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

  /** Creates a pending auto-invite record once per member. Returns false if already queued. */
  async queueAutoMemberPortalInvitation(params: {
    gymId: string;
    memberId: string;
    recipientEmail: string;
  }): Promise<boolean> {
    const id = buildMemberPortalAutoInviteDeliveryId(params);
    const ref = this.col().doc(id);
    const now = Timestamp.now();

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) return false;

      const doc: NotificationDeliveryDoc = {
        gymId: params.gymId,
        memberId: params.memberId,
        kind: "MEMBER_PORTAL_INVITE",
        channel: "EMAIL",
        recipientEmail: params.recipientEmail.trim(),
        trigger: "AUTO_ON_REGISTER",
        status: "PENDING",
        createdAt: now,
        lastAttemptAt: null,
        attemptCount: 0,
        sentAt: null,
        sendLeaseExpiresAt: null,
        activeSendAttempt: null,
        providerMessageId: null,
      };
      tx.set(ref, doc);
      return true;
    });
  }

  async getMemberPortalAutoInvitation(
    gymId: string,
    memberId: string,
  ): Promise<MemberPortalInvitationSummary | null> {
    const id = buildMemberPortalAutoInviteDeliveryId({ gymId, memberId });
    const snap = await this.col().doc(id).get();
    if (!snap.exists) return null;
    const data = snap.data() as NotificationDeliveryDoc;
    if (data.gymId !== gymId || data.memberId !== memberId) return null;
    if (data.kind !== "MEMBER_PORTAL_INVITE") return null;

    return {
      status: data.status ?? null,
      recipientEmail: data.recipientEmail ?? null,
      lastAttemptAt: data.lastAttemptAt?.toDate() ?? null,
    };
  }

  async ensureMemberPortalInvitationRecord(params: {
    gymId: string;
    memberId: string;
    recipientEmail: string;
    trigger: MemberPortalInvitationTrigger;
  }): Promise<string> {
    const id = buildMemberPortalAutoInviteDeliveryId(params);
    const ref = this.col().doc(id);
    const now = Timestamp.now();
    const snap = await ref.get();
    if (snap.exists) {
      const data = snap.data() as NotificationDeliveryDoc;
      const patch: Partial<NotificationDeliveryDoc> = {
        recipientEmail: params.recipientEmail.trim(),
        trigger: params.trigger,
      };
      if (params.trigger === "STAFF_RESEND") {
        patch.status = "PENDING";
        patch.attemptCount = 0;
        patch.lastAttemptAt = Timestamp.now();
        patch.sendLeaseExpiresAt = null;
        patch.activeSendAttempt = null;
        patch.providerMessageId = null;
      } else if (data.recipientEmail !== params.recipientEmail.trim()) {
        patch.status = "PENDING";
        patch.lastAttemptAt = Timestamp.now();
      }
      await ref.update(patch);
      return id;
    }

    const doc: NotificationDeliveryDoc = {
      gymId: params.gymId,
      memberId: params.memberId,
      kind: "MEMBER_PORTAL_INVITE",
      channel: "EMAIL",
      recipientEmail: params.recipientEmail.trim(),
      trigger: params.trigger,
      status: "PENDING",
      createdAt: now,
      lastAttemptAt: null,
      attemptCount: 0,
      sentAt: null,
      sendLeaseExpiresAt: null,
      activeSendAttempt: null,
      providerMessageId: null,
    };
    await ref.set(doc);
    return id;
  }

  /**
   * Atomically claims an in-flight send lease. Reclaims expired leases for stale PENDING work.
   */
  async claimMemberPortalInvitationSend(
    deliveryId: string,
    options?: {
      maxAttempts?: number;
      leaseMs?: number;
      now?: Date;
    },
  ): Promise<MemberPortalInvitationClaimResult> {
    const maxAttempts =
      options?.maxAttempts ?? MAX_MEMBER_PORTAL_INVITE_ATTEMPTS;
    const leaseMs = options?.leaseMs ?? MEMBER_PORTAL_INVITE_LEASE_MS;
    const now = options?.now ?? new Date();
    const nowMs = now.getTime();
    const ref = this.col().doc(deliveryId);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        return { ok: false, reason: "missing" };
      }

      const data = snap.data() as NotificationDeliveryDoc;
      if (data.kind !== "MEMBER_PORTAL_INVITE") {
        return { ok: false, reason: "missing" };
      }

      if (data.status === "SENT") {
        return { ok: false, reason: "already_sent" };
      }

      if (data.status === "NOT_CONFIGURED") {
        return { ok: false, reason: "not_configured" };
      }

      if (data.status === "FAILED") {
        return { ok: false, reason: "failed_final" };
      }

      const completedAttempts = data.attemptCount ?? 0;
      const leaseExpiresMs = data.sendLeaseExpiresAt?.toMillis() ?? 0;
      const leaseActive = leaseExpiresMs > nowMs;

      if (leaseActive) {
        return { ok: false, reason: "in_flight" };
      }

      let attemptNumber: number;
      const staleAttempt = data.activeSendAttempt ?? null;

      if (staleAttempt != null && leaseExpiresMs > 0) {
        attemptNumber = staleAttempt;
      } else {
        if (completedAttempts >= maxAttempts) {
          tx.update(ref, { status: "FAILED", sendLeaseExpiresAt: null });
          return { ok: false, reason: "max_attempts" };
        }
        attemptNumber = completedAttempts + 1;
      }

      const idempotencyKey = buildMemberPortalInvitationIdempotencyKey(
        deliveryId,
        attemptNumber,
      );

      tx.update(ref, {
        status: "PENDING",
        attemptCount: attemptNumber,
        activeSendAttempt: attemptNumber,
        sendLeaseExpiresAt: Timestamp.fromMillis(nowMs + leaseMs),
        lastAttemptAt: Timestamp.now(),
      });

      return { ok: true, attemptNumber, idempotencyKey };
    });
  }

  async completeMemberPortalInvitationAttempt(
    deliveryId: string,
    status: MemberPortalInvitationStatus,
    options?: { providerMessageId?: string },
  ): Promise<void> {
    const ref = this.col().doc(deliveryId);
    const patch: Partial<NotificationDeliveryDoc> = {
      status,
      lastAttemptAt: Timestamp.now(),
      sendLeaseExpiresAt: null,
      activeSendAttempt: null,
    };
    if (status === "SENT") {
      patch.sentAt = Timestamp.now();
      patch.providerMessageId = options?.providerMessageId ?? null;
    }
    await ref.update(patch);
  }

  async shouldRecoverMemberPortalInvitation(
    gymId: string,
    memberId: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const id = buildMemberPortalAutoInviteDeliveryId({ gymId, memberId });
    const snap = await this.col().doc(id).get();
    if (!snap.exists) return false;
    const data = snap.data() as NotificationDeliveryDoc;
    if (data.kind !== "MEMBER_PORTAL_INVITE") return false;
    if (data.status !== "PENDING") return false;
    const leaseExpiresMs = data.sendLeaseExpiresAt?.toMillis() ?? 0;
    return leaseExpiresMs <= now.getTime();
  }

  async listRecoverableMemberPortalInvitations(
    now: Date = new Date(),
    limit = 50,
  ): Promise<Array<{ gymId: string; memberId: string }>> {
    const snap = await this.col()
      .where("kind", "==", "MEMBER_PORTAL_INVITE")
      .where("status", "==", "PENDING")
      .limit(Math.max(limit * 4, limit))
      .get();

    const nowMs = now.getTime();
    const results: Array<{ gymId: string; memberId: string }> = [];

    for (const doc of snap.docs) {
      const data = doc.data() as NotificationDeliveryDoc;
      const leaseExpiresMs = data.sendLeaseExpiresAt?.toMillis() ?? 0;
      if (leaseExpiresMs > nowMs) continue;
      results.push({ gymId: data.gymId, memberId: data.memberId });
      if (results.length >= limit) break;
    }

    return results;
  }
}
