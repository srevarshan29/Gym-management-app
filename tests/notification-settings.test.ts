import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateGymNotificationSettings } from "@/app/actions/notification-settings";
import { mergeGymNotificationSettings } from "@/lib/notification-settings/merge";
import {
  DEFAULT_MEMBERSHIP_EXPIRY_3_DAY,
  DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
} from "@/lib/notification-settings/defaults";
import { processExpiryReminderCandidate } from "@/lib/membership-expiry-reminders/process-candidate";
import type { ExpiryReminderCandidate } from "@/lib/membership-expiry-reminders/types";
import { canManageNotificationSettings } from "@/lib/permissions";
import type { GymNotificationSettingsDoc } from "@/lib/firestore/types";
import { Timestamp } from "firebase-admin/firestore";

const { requireGym, upsert, deliverPaymentReceiptEmailsMock, getGymNotificationSettingsMock } =
  vi.hoisted(() => ({
    requireGym: vi.fn(),
    upsert: vi.fn(),
    deliverPaymentReceiptEmailsMock: vi.fn().mockResolvedValue(undefined),
    getGymNotificationSettingsMock: vi.fn(),
  }));

vi.mock("@/lib/session", () => ({
  requireGym,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    gymNotificationSettings: { upsert },
  }),
}));

vi.mock("@/lib/payment-email-notifications", () => ({
  deliverPaymentReceiptEmails: (...args: unknown[]) =>
    deliverPaymentReceiptEmailsMock(...args),
}));

vi.mock("@/lib/notification-settings/get-settings", () => ({
  getGymNotificationSettings: (...args: unknown[]) =>
    getGymNotificationSettingsMock(...args),
}));

vi.mock("@/lib/receipts", () => ({
  getOrCreateReceiptByPayment: vi.fn().mockResolvedValue({
    number: 1,
    amount: 1000,
    gymName: "Iron Gym",
    memberName: "Priya",
    memberPhone: "7777777777",
    memberEmail: "priya@example.com",
    paidAt: new Date("2026-10-04T12:00:00.000Z"),
    periodEnd: null,
    periodStart: null,
  }),
}));

vi.mock("@/lib/gym-profile", () => ({
  getGymProfile: vi.fn().mockResolvedValue({
    ownerNotifyPhone: null,
    ownerNotifyEmail: null,
  }),
}));

const now = new Date("2026-10-04T12:00:00.000Z");

function candidate(
  overrides: Partial<ExpiryReminderCandidate> = {},
): ExpiryReminderCandidate {
  return {
    gymId: "gym-a",
    memberId: "member-1",
    memberName: "Priya",
    memberEmail: "priya@example.com",
    currentSubscriptionId: "sub-current",
    currentEndDate: new Date("2026-10-11T15:00:00.000Z"),
    ...overrides,
  };
}

describe("mergeGymNotificationSettings", () => {
  it("returns defaults when no Firestore settings exist", () => {
    const merged = mergeGymNotificationSettings("gym-a", null);
    expect(merged.gymId).toBe("gym-a");
    expect(merged.paymentReceiptEmail.enabled).toBe(true);
    expect(merged.membershipExpiry7Day.subject).toContain("{{days_remaining}}");
  });

  it("does not apply another gym's stored document", () => {
    const stored = {
      gymId: "gym-other",
      paymentReceiptEmail: {
        enabled: false,
        subject: "Other gym",
        body: "Other",
      },
      membershipExpiry7Day: DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
      membershipExpiry3Day: DEFAULT_MEMBERSHIP_EXPIRY_3_DAY,
      updatedAt: Timestamp.now(),
    } satisfies GymNotificationSettingsDoc;

    const merged = mergeGymNotificationSettings("gym-a", stored);
    expect(merged.paymentReceiptEmail.enabled).toBe(true);
    expect(merged.paymentReceiptEmail.subject).not.toBe("Other gym");
  });

  it("merges stored settings for the matching gym", () => {
    const stored: GymNotificationSettingsDoc = {
      gymId: "gym-a",
      paymentReceiptEmail: {
        enabled: false,
        subject: "Custom subject",
        body: "Custom body",
      },
      membershipExpiry7Day: DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
      membershipExpiry3Day: DEFAULT_MEMBERSHIP_EXPIRY_3_DAY,
      updatedAt: Timestamp.now(),
    };

    const merged = mergeGymNotificationSettings("gym-a", stored);
    expect(merged.paymentReceiptEmail.enabled).toBe(false);
    expect(merged.paymentReceiptEmail.subject).toBe("Custom subject");
  });
});

describe("canManageNotificationSettings", () => {
  it("allows owners only", () => {
    expect(canManageNotificationSettings("OWNER")).toBe(true);
    expect(canManageNotificationSettings("ADMIN")).toBe(false);
    expect(canManageNotificationSettings("STAFF")).toBe(false);
  });
});

describe("updateGymNotificationSettings", () => {
  beforeEach(() => {
    requireGym.mockReset();
    upsert.mockReset();
  });

  function formWithChannels(
    overrides: Partial<{ paymentEnabled: boolean }> = {},
  ) {
    const form = new FormData();
    form.set(
      "paymentReceiptEmail.enabled",
      overrides.paymentEnabled === false ? "false" : "true",
    );
    form.set("paymentReceiptEmail.subject", "Receipt {{receipt_number}}");
    form.set("paymentReceiptEmail.body", "");
    form.set("membershipExpiry7Day.enabled", "true");
    form.set("membershipExpiry7Day.subject", "7 day");
    form.set("membershipExpiry7Day.body", "Body 7");
    form.set("membershipExpiry3Day.enabled", "true");
    form.set("membershipExpiry3Day.subject", "3 day");
    form.set("membershipExpiry3Day.body", "Body 3");
    return form;
  }

  it("lets the owner update settings", async () => {
    requireGym.mockResolvedValue({
      id: "owner-1",
      gymId: "gym-a",
      role: "OWNER",
    });
    upsert.mockResolvedValue(undefined);

    const result = await updateGymNotificationSettings(
      undefined,
      formWithChannels(),
    );

    expect(result.ok).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ gymId: "gym-a", role: "OWNER" }),
      "gym-a",
      expect.objectContaining({
        paymentReceiptEmail: expect.objectContaining({ enabled: true }),
      }),
    );
  });

  it("rejects non-owner updates", async () => {
    requireGym.mockResolvedValue({
      id: "admin-1",
      gymId: "gym-a",
      role: "ADMIN",
    });

    const result = await updateGymNotificationSettings(
      undefined,
      formWithChannels(),
    );

    expect(result.ok).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("membership expiry reminder toggles", () => {
  it("skips 7-day delivery when disabled", async () => {
    const sendEmail = vi.fn();
    const claimDelivery = vi.fn();

    const result = await processExpiryReminderCandidate(
      candidate(),
      7,
      "Iron Gym",
      now,
      { ...DEFAULT_MEMBERSHIP_EXPIRY_7_DAY, enabled: false },
      {
        claimDelivery,
        releaseDelivery: vi.fn(),
        sendEmail,
      },
    );

    expect(result).toBe("skipped_disabled");
    expect(claimDelivery).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("skips 3-day delivery when disabled", async () => {
    const sendEmail = vi.fn();

    const result = await processExpiryReminderCandidate(
      candidate({ currentEndDate: new Date("2026-10-07T08:00:00.000Z") }),
      3,
      "Iron Gym",
      now,
      { ...DEFAULT_MEMBERSHIP_EXPIRY_3_DAY, enabled: false },
      {
        claimDelivery: vi.fn(),
        releaseDelivery: vi.fn(),
        sendEmail,
      },
    );

    expect(result).toBe("skipped_disabled");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("notifyPaymentLogged payment receipt toggle", () => {
  beforeEach(() => {
    deliverPaymentReceiptEmailsMock.mockClear();
    getGymNotificationSettingsMock.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("does not deliver payment receipt email when disabled", async () => {
    getGymNotificationSettingsMock.mockResolvedValue({
      gymId: "gym-a",
      paymentReceiptEmail: {
        enabled: false,
        subject: "",
        body: "",
      },
      membershipExpiry7Day: DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
      membershipExpiry3Day: DEFAULT_MEMBERSHIP_EXPIRY_3_DAY,
    });

    const { notifyPaymentLogged } = await import("@/lib/notifications");
    await notifyPaymentLogged("gym-a", "pay-1");

    expect(deliverPaymentReceiptEmailsMock).not.toHaveBeenCalled();
  });
});
