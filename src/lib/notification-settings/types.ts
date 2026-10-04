export type NotificationChannelSettings = {
  enabled: boolean;
  subject: string;
  body: string;
};

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
};
