import type { NotificationChannelSettings } from "@/lib/notification-settings/types";

export const DEFAULT_PAYMENT_RECEIPT_EMAIL: NotificationChannelSettings = {
  enabled: true,
  subject:
    "Payment receipt {{receipt_number}} for {{member_name}} — {{gym_name}}",
  body: "",
};

export const DEFAULT_MEMBERSHIP_EXPIRY_7_DAY: NotificationChannelSettings = {
  enabled: true,
  subject: "Membership expires in {{days_remaining}} days - {{gym_name}}",
  body: [
    "Hi {{member_name}},",
    "",
    "Your membership at {{gym_name}} expires on {{expiry_date}}.",
    "",
    "Please renew your membership to continue your workouts without interruption.",
    "",
    "Thank you,",
    "{{gym_name}}",
  ].join("\n"),
};

export const DEFAULT_MEMBERSHIP_EXPIRY_3_DAY: NotificationChannelSettings = {
  enabled: true,
  subject: "Membership expires in {{days_remaining}} days - {{gym_name}}",
  body: [
    "Hi {{member_name}},",
    "",
    "Your membership at {{gym_name}} expires on {{expiry_date}}.",
    "",
    "Please renew your membership to continue your workouts without interruption.",
    "",
    "Thank you,",
    "{{gym_name}}",
  ].join("\n"),
};

export function defaultGymNotificationSettings(gymId: string) {
  return {
    gymId,
    paymentReceiptEmail: { ...DEFAULT_PAYMENT_RECEIPT_EMAIL },
    membershipExpiry7Day: { ...DEFAULT_MEMBERSHIP_EXPIRY_7_DAY },
    membershipExpiry3Day: { ...DEFAULT_MEMBERSHIP_EXPIRY_3_DAY },
  };
}
