import type { GymNotificationSettingsDoc } from "@/lib/firestore/types";
import {
  DEFAULT_MEMBERSHIP_EXPIRY_3_DAY,
  DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
  DEFAULT_PAYMENT_RECEIPT_EMAIL,
  defaultGymNotificationSettings,
} from "@/lib/notification-settings/defaults";
import type {
  GymNotificationSettingsData,
  NotificationChannelSettings,
} from "@/lib/notification-settings/types";

function mergeChannel(
  defaults: NotificationChannelSettings,
  stored: Partial<NotificationChannelSettings> | undefined,
): NotificationChannelSettings {
  return {
    enabled: stored?.enabled ?? defaults.enabled,
    subject:
      stored?.subject !== undefined && stored.subject !== null
        ? stored.subject
        : defaults.subject,
    body:
      stored?.body !== undefined && stored.body !== null
        ? stored.body
        : defaults.body,
  };
}

export function mergeGymNotificationSettings(
  gymId: string,
  stored: GymNotificationSettingsDoc | null,
): GymNotificationSettingsData {
  const defaults = defaultGymNotificationSettings(gymId);
  if (!stored || stored.gymId !== gymId) {
    return defaults;
  }

  return {
    gymId,
    paymentReceiptEmail: mergeChannel(
      DEFAULT_PAYMENT_RECEIPT_EMAIL,
      stored.paymentReceiptEmail,
    ),
    membershipExpiry7Day: mergeChannel(
      DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
      stored.membershipExpiry7Day,
    ),
    membershipExpiry3Day: mergeChannel(
      DEFAULT_MEMBERSHIP_EXPIRY_3_DAY,
      stored.membershipExpiry3Day,
    ),
  };
}
