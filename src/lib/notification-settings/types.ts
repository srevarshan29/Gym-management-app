export type NotificationChannelSettings = {
  enabled: boolean;
  subject: string;
  body: string;
};

export type GymNotificationSettingsData = {
  gymId: string;
  paymentReceiptEmail: NotificationChannelSettings;
  membershipExpiry7Day: NotificationChannelSettings;
  membershipExpiry3Day: NotificationChannelSettings;
};
