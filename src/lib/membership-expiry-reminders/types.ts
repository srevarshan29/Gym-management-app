import type { MembershipExpiryReminderType } from "@/lib/firestore/types";
import type {
  GymNotificationSettingsData,
  NotificationChannelSettings,
} from "@/lib/notification-settings/types";

/** Calendar-day offset: `daysUntil(endDate, now)` must equal this value. */
export type ExpiryReminderDaysUntil = 7 | 3 | 0 | -2 | -7 | -14 | -30;

/** @deprecated Use `ExpiryReminderDaysUntil` — kept for existing tests/imports. */
export type ExpiryReminderDays = ExpiryReminderDaysUntil;

export type ExpiryReminderCandidate = {
  gymId: string;
  memberId: string;
  memberName: string;
  memberEmail: string | null;
  currentSubscriptionId: string | null;
  currentEndDate: Date | null;
};

export type ExpiryReminderDeliveryRecord = {
  gymId: string;
  memberId: string;
  subscriptionId: string;
  reminderType: MembershipExpiryReminderType;
  recipientEmail: string;
};

export type MembershipExpiryReminderSettingsKey = Exclude<
  keyof GymNotificationSettingsData,
  "gymId" | "paymentReceiptEmail"
>;

export type ExpiryReminderScheduleEntry = {
  reminderType: MembershipExpiryReminderType;
  daysUntil: ExpiryReminderDaysUntil;
  settingsKey: MembershipExpiryReminderSettingsKey;
};

export const MEMBERSHIP_EXPIRY_REMINDER_SCHEDULE: readonly ExpiryReminderScheduleEntry[] =
  [
    {
      reminderType: "EXPIRY_7_DAY",
      daysUntil: 7,
      settingsKey: "membershipExpiry7Day",
    },
    {
      reminderType: "EXPIRY_3_DAY",
      daysUntil: 3,
      settingsKey: "membershipExpiry3Day",
    },
    {
      reminderType: "EXPIRY_DAY",
      daysUntil: 0,
      settingsKey: "membershipExpiryDay",
    },
    {
      reminderType: "EXPIRY_2_DAYS_AFTER",
      daysUntil: -2,
      settingsKey: "membershipExpiry2DaysAfter",
    },
    {
      reminderType: "EXPIRY_7_DAYS_AFTER",
      daysUntil: -7,
      settingsKey: "membershipExpiry7DaysAfter",
    },
    {
      reminderType: "EXPIRY_14_DAYS_AFTER",
      daysUntil: -14,
      settingsKey: "membershipExpiry14DaysAfter",
    },
    {
      reminderType: "EXPIRY_30_DAYS_AFTER",
      daysUntil: -30,
      settingsKey: "membershipExpiry30DaysAfter",
    },
  ];

export function daysUntilForReminderType(
  reminderType: MembershipExpiryReminderType,
): ExpiryReminderDaysUntil {
  const entry = MEMBERSHIP_EXPIRY_REMINDER_SCHEDULE.find(
    (item) => item.reminderType === reminderType,
  );
  if (!entry) {
    throw new Error(`Unknown membership expiry reminder type: ${reminderType}`);
  }
  return entry.daysUntil;
}

export function channelSettingsForReminderType(
  settings: GymNotificationSettingsData,
  reminderType: MembershipExpiryReminderType,
): NotificationChannelSettings {
  const entry = MEMBERSHIP_EXPIRY_REMINDER_SCHEDULE.find(
    (item) => item.reminderType === reminderType,
  );
  if (!entry) {
    throw new Error(`Unknown membership expiry reminder type: ${reminderType}`);
  }
  return settings[entry.settingsKey];
}

/** @deprecated Use schedule helpers — maps legacy 7/3-only callers. */
export function reminderTypeForDays(
  days: ExpiryReminderDaysUntil,
): MembershipExpiryReminderType {
  const entry = MEMBERSHIP_EXPIRY_REMINDER_SCHEDULE.find(
    (item) => item.daysUntil === days,
  );
  if (!entry) {
    throw new Error(`No reminder type for daysUntil=${days}`);
  }
  return entry.reminderType;
}
