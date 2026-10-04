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

export const DEFAULT_MEMBERSHIP_EXPIRY_DAY: NotificationChannelSettings = {
  enabled: true,
  subject: "Your membership expires today — {{gym_name}}",
  body: [
    "Hi {{member_name}},",
    "",
    "Your membership at {{gym_name}} expires today ({{expiry_date}}).",
    "",
    "Please renew today to keep your access without interruption.",
    "",
    "Thank you,",
    "{{gym_name}}",
  ].join("\n"),
};

export const DEFAULT_MEMBERSHIP_EXPIRY_2_DAYS_AFTER: NotificationChannelSettings =
  {
    enabled: true,
    subject: "We miss you at {{gym_name}} — {{days_remaining}} days since expiry",
    body: [
      "Hi {{member_name}},",
      "",
      "Your membership at {{gym_name}} expired on {{expiry_date}}.",
      "",
      "Renew anytime to get back to your routine.",
      "",
      "Thank you,",
      "{{gym_name}}",
    ].join("\n"),
  };

export const DEFAULT_MEMBERSHIP_EXPIRY_7_DAYS_AFTER: NotificationChannelSettings =
  {
    enabled: true,
    subject:
      "Renew at {{gym_name}} — expired {{days_remaining}} days from today",
    body: [
      "Hi {{member_name}},",
      "",
      "Your membership at {{gym_name}} expired on {{expiry_date}}.",
      "",
      "We would love to welcome you back. Visit us or reply to renew.",
      "",
      "Thank you,",
      "{{gym_name}}",
    ].join("\n"),
  };

export const DEFAULT_MEMBERSHIP_EXPIRY_14_DAYS_AFTER: NotificationChannelSettings =
  {
    enabled: true,
    subject: "Rejoin {{gym_name}} — {{days_remaining}} days since expiry",
    body: [
      "Hi {{member_name}},",
      "",
      "Your membership at {{gym_name}} expired on {{expiry_date}}.",
      "",
      "If you are ready to return, renew and pick up where you left off.",
      "",
      "Thank you,",
      "{{gym_name}}",
    ].join("\n"),
  };

export const DEFAULT_MEMBERSHIP_EXPIRY_30_DAYS_AFTER: NotificationChannelSettings =
  {
    enabled: true,
    subject: "We are here when you are ready — {{gym_name}}",
    body: [
      "Hi {{member_name}},",
      "",
      "Your membership at {{gym_name}} expired on {{expiry_date}} ({{days_remaining}} days remaining on the calendar).",
      "",
      "Whenever you are ready, we are here to help you restart your fitness journey.",
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
    membershipExpiryDay: { ...DEFAULT_MEMBERSHIP_EXPIRY_DAY },
    membershipExpiry2DaysAfter: { ...DEFAULT_MEMBERSHIP_EXPIRY_2_DAYS_AFTER },
    membershipExpiry7DaysAfter: { ...DEFAULT_MEMBERSHIP_EXPIRY_7_DAYS_AFTER },
    membershipExpiry14DaysAfter: { ...DEFAULT_MEMBERSHIP_EXPIRY_14_DAYS_AFTER },
    membershipExpiry30DaysAfter: { ...DEFAULT_MEMBERSHIP_EXPIRY_30_DAYS_AFTER },
  };
}
