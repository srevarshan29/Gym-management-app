import type { GymNotificationSettingsDoc } from "@/lib/firestore/types";
import {
  DEFAULT_INACTIVE_AFTER_DAYS,
  DEFAULT_INACTIVE_MEMBER_EMAIL,
  DEFAULT_MEMBERSHIP_EXPIRY_14_DAYS_AFTER,
  DEFAULT_MEMBERSHIP_EXPIRY_2_DAYS_AFTER,
  DEFAULT_MEMBERSHIP_EXPIRY_30_DAYS_AFTER,
  DEFAULT_MEMBERSHIP_EXPIRY_3_DAY,
  DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
  DEFAULT_MEMBERSHIP_EXPIRY_7_DAYS_AFTER,
  DEFAULT_MEMBERSHIP_EXPIRY_DAY,
  DEFAULT_MANUAL_RENEWAL_REMINDER,
  DEFAULT_PAYMENT_RECEIPT_EMAIL,
  defaultGymNotificationSettings,
} from "@/lib/notification-settings/defaults";
import type {
  GymNotificationSettingsData,
  InactiveMemberAfterDays,
  NotificationChannelSettings,
} from "@/lib/notification-settings/types";
import { INACTIVE_MEMBER_AFTER_DAY_OPTIONS } from "@/lib/notification-settings/types";

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

function mergeInactiveAfterDays(
  stored: number | undefined,
): InactiveMemberAfterDays {
  if (
    stored !== undefined &&
    (INACTIVE_MEMBER_AFTER_DAY_OPTIONS as readonly number[]).includes(stored)
  ) {
    return stored as InactiveMemberAfterDays;
  }
  return DEFAULT_INACTIVE_AFTER_DAYS;
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
    automaticEmailNotificationsEnabled:
      stored.automaticEmailNotificationsEnabled !== false,
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
    membershipExpiryDay: mergeChannel(
      DEFAULT_MEMBERSHIP_EXPIRY_DAY,
      stored.membershipExpiryDay,
    ),
    membershipExpiry2DaysAfter: mergeChannel(
      DEFAULT_MEMBERSHIP_EXPIRY_2_DAYS_AFTER,
      stored.membershipExpiry2DaysAfter,
    ),
    membershipExpiry7DaysAfter: mergeChannel(
      DEFAULT_MEMBERSHIP_EXPIRY_7_DAYS_AFTER,
      stored.membershipExpiry7DaysAfter,
    ),
    membershipExpiry14DaysAfter: mergeChannel(
      DEFAULT_MEMBERSHIP_EXPIRY_14_DAYS_AFTER,
      stored.membershipExpiry14DaysAfter,
    ),
    membershipExpiry30DaysAfter: mergeChannel(
      DEFAULT_MEMBERSHIP_EXPIRY_30_DAYS_AFTER,
      stored.membershipExpiry30DaysAfter,
    ),
    manualRenewalReminder: mergeChannel(
      DEFAULT_MANUAL_RENEWAL_REMINDER,
      stored.manualRenewalReminder,
    ),
    inactiveMemberEmail: mergeChannel(
      DEFAULT_INACTIVE_MEMBER_EMAIL,
      stored.inactiveMemberEmail,
    ),
    inactiveAfterDays: mergeInactiveAfterDays(stored.inactiveAfterDays),
  };
}
