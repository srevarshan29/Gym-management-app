export type NotificationChannelSettings = {
  enabled: boolean;
  subject: string;
  body: string;
};

export const INACTIVE_MEMBER_AFTER_DAY_OPTIONS = [1, 3, 7, 14, 30] as const;

export type InactiveMemberAfterDays =
  (typeof INACTIVE_MEMBER_AFTER_DAY_OPTIONS)[number];

export type GymNotificationSettingsData = {
  gymId: string;
  /** Global gate for automated emails (payment receipts + expiry cron). Default ON. */
  automaticEmailNotificationsEnabled: boolean;
  paymentReceiptEmail: NotificationChannelSettings;
  membershipExpiry7Day: NotificationChannelSettings;
  membershipExpiry3Day: NotificationChannelSettings;
  membershipExpiryDay: NotificationChannelSettings;
  membershipExpiry2DaysAfter: NotificationChannelSettings;
  membershipExpiry7DaysAfter: NotificationChannelSettings;
  membershipExpiry14DaysAfter: NotificationChannelSettings;
  membershipExpiry30DaysAfter: NotificationChannelSettings;
  manualRenewalReminder: NotificationChannelSettings;
  inactiveMemberEmail: NotificationChannelSettings;
  inactiveAfterDays: InactiveMemberAfterDays;
};
