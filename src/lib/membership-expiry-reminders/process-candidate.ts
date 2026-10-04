import { buildMembershipExpiryEmailFromSettings } from "@/lib/notification-settings/membership-expiry-email";
import type { NotificationChannelSettings } from "@/lib/notification-settings/types";
import { isEligibleForExpiryReminder } from "@/lib/membership-expiry-reminders/window";

import type {
  ExpiryReminderCandidate,
  ExpiryReminderDays,
  ExpiryReminderDeliveryRecord,
} from "./types";
import { reminderTypeForDays } from "./types";

export type ProcessExpiryReminderResult =
  | "skipped_ineligible"
  | "skipped_disabled"
  | "skipped_duplicate"
  | "sent"
  | "send_failed";

export type ExpiryReminderProcessorDeps = {
  claimDelivery: (record: ExpiryReminderDeliveryRecord) => Promise<boolean>;
  releaseDelivery: (
    record: Pick<
      ExpiryReminderDeliveryRecord,
      "gymId" | "memberId" | "subscriptionId" | "reminderType"
    >,
  ) => Promise<void>;
  sendEmail: (params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<void>;
};

export async function processExpiryReminderCandidate(
  candidate: ExpiryReminderCandidate,
  reminderDays: ExpiryReminderDays,
  gymName: string,
  now: Date,
  channelSettings: NotificationChannelSettings,
  deps: ExpiryReminderProcessorDeps,
): Promise<ProcessExpiryReminderResult> {
  if (!channelSettings.enabled) {
    return "skipped_disabled";
  }

  if (!isEligibleForExpiryReminder(candidate, reminderDays, now)) {
    return "skipped_ineligible";
  }

  const subscriptionId = candidate.currentSubscriptionId!;
  const recipientEmail = candidate.memberEmail!.trim();
  const reminderType = reminderTypeForDays(reminderDays);
  const deliveryRecord: ExpiryReminderDeliveryRecord = {
    gymId: candidate.gymId,
    memberId: candidate.memberId,
    subscriptionId,
    reminderType,
    recipientEmail,
  };

  const claimed = await deps.claimDelivery(deliveryRecord);
  if (!claimed) {
    return "skipped_duplicate";
  }

  const { subject, html, text } = buildMembershipExpiryEmailFromSettings(
    channelSettings,
    {
      memberName: candidate.memberName,
      gymName,
      expiryDate: candidate.currentEndDate!,
      daysRemaining: reminderDays,
    },
  );

  try {
    await deps.sendEmail({ to: recipientEmail, subject, html, text });
    return "sent";
  } catch (err) {
    console.error("[membership-expiry-reminders] send failed:", {
      gymId: candidate.gymId,
      memberId: candidate.memberId,
      subscriptionId,
      reminderType,
      err,
    });
    await deps.releaseDelivery(deliveryRecord).catch((releaseErr) => {
      console.error(
        "[membership-expiry-reminders] failed to release delivery claim:",
        releaseErr,
      );
    });
    return "send_failed";
  }
}
