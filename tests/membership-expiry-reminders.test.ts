import { describe, expect, it, vi } from "vitest";

import { verifyCronSecret } from "@/lib/cron-auth";
import { DEFAULT_MEMBERSHIP_EXPIRY_7_DAY } from "@/lib/notification-settings/defaults";
import { buildMembershipExpiryDeliveryId } from "@/lib/membership-expiry-reminders/delivery-id";
import { processExpiryReminderCandidate } from "@/lib/membership-expiry-reminders/process-candidate";
import type { ExpiryReminderCandidate } from "@/lib/membership-expiry-reminders/types";
import {
  expiryCalendarDayRange,
  isEligibleForExpiryReminder,
} from "@/lib/membership-expiry-reminders/window";

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

describe("isEligibleForExpiryReminder", () => {
  it("is eligible exactly 7 days before expiry", () => {
    expect(isEligibleForExpiryReminder(candidate(), 7, now)).toBe(true);
  });

  it("is eligible exactly 3 days before expiry", () => {
    expect(
      isEligibleForExpiryReminder(
        candidate({ currentEndDate: new Date("2026-10-07T08:00:00.000Z") }),
        3,
        now,
      ),
    ).toBe(true);
  });

  it("skips members without email", () => {
    expect(
      isEligibleForExpiryReminder(
        candidate({ memberEmail: null }),
        7,
        now,
      ),
    ).toBe(false);
  });

  it("skips members without a current subscription id", () => {
    expect(
      isEligibleForExpiryReminder(
        candidate({ currentSubscriptionId: null }),
        7,
        now,
      ),
    ).toBe(false);
  });
});

describe("buildMembershipExpiryDeliveryId", () => {
  it("includes gymId, member, subscription, and reminder type", () => {
    expect(
      buildMembershipExpiryDeliveryId({
        gymId: "gym-a",
        memberId: "member-1",
        subscriptionId: "sub-1",
        reminderType: "EXPIRY_7_DAY",
      }),
    ).toBe("gym-a__member-1__sub-1__EXPIRY_7_DAY");
  });

  it("allows a renewed subscription cycle to receive its own reminder id", () => {
    const oldId = buildMembershipExpiryDeliveryId({
      gymId: "gym-a",
      memberId: "member-1",
      subscriptionId: "sub-old",
      reminderType: "EXPIRY_7_DAY",
    });
    const newId = buildMembershipExpiryDeliveryId({
      gymId: "gym-a",
      memberId: "member-1",
      subscriptionId: "sub-new",
      reminderType: "EXPIRY_7_DAY",
    });
    expect(oldId).not.toBe(newId);
  });
});

describe("processExpiryReminderCandidate", () => {
  it("skips duplicate reminders for the same subscription and type", async () => {
    const claimDelivery = vi.fn().mockResolvedValue(false);
    const sendEmail = vi.fn();

    const result = await processExpiryReminderCandidate(
      candidate(),
      7,
      "Iron Gym",
      now,
      DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
      {
        claimDelivery,
        releaseDelivery: vi.fn(),
        sendEmail,
      },
    );

    expect(result).toBe("skipped_duplicate");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(claimDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        gymId: "gym-a",
        memberId: "member-1",
        subscriptionId: "sub-current",
        reminderType: "EXPIRY_7_DAY",
      }),
    );
  });

  it("does not send for an old subscription when the member has renewed", async () => {
    const claimDelivery = vi.fn();
    const sendEmail = vi.fn();

    const result = await processExpiryReminderCandidate(
      candidate({
        currentSubscriptionId: "sub-new",
        currentEndDate: new Date("2026-11-01T00:00:00.000Z"),
      }),
      7,
      "Iron Gym",
      now,
      DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
      {
        claimDelivery,
        releaseDelivery: vi.fn(),
        sendEmail,
      },
    );

    expect(result).toBe("skipped_ineligible");
    expect(claimDelivery).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends when eligible and delivery claim succeeds", async () => {
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const result = await processExpiryReminderCandidate(
      candidate(),
      7,
      "Iron Gym",
      now,
      DEFAULT_MEMBERSHIP_EXPIRY_7_DAY,
      {
        claimDelivery: vi.fn().mockResolvedValue(true),
        releaseDelivery: vi.fn(),
        sendEmail,
      },
    );

    expect(result).toBe("sent");
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "priya@example.com" }),
    );
  });
});

describe("expiryCalendarDayRange", () => {
  it("targets the calendar day 7 days from now", () => {
    const range = expiryCalendarDayRange(7, now);
    expect(range.start.toDateString()).toBe(new Date(2026, 9, 11).toDateString());
  });
});

describe("verifyCronSecret", () => {
  it("rejects missing authorization", () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    expect(
      verifyCronSecret(new Request("http://localhost/api/cron/test")),
    ).toBe(false);
    vi.unstubAllEnvs();
  });

  it("rejects invalid CRON_SECRET bearer token", () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    expect(
      verifyCronSecret(
        new Request("http://localhost/api/cron/test", {
          headers: { authorization: "Bearer wrong" },
        }),
      ),
    ).toBe(false);
    vi.unstubAllEnvs();
  });

  it("accepts a valid CRON_SECRET bearer token", () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    expect(
      verifyCronSecret(
        new Request("http://localhost/api/cron/test", {
          headers: { authorization: "Bearer test-secret" },
        }),
      ),
    ).toBe(true);
    vi.unstubAllEnvs();
  });
});

describe("membership expiry cron route", () => {
  it("returns 401 when CRON_SECRET is invalid", async () => {
    vi.stubEnv("CRON_SECRET", "expected");
    const { GET } = await import(
      "@/app/api/cron/membership-expiry-reminders/route"
    );
    const response = await GET(
      new Request("http://localhost/api/cron/membership-expiry-reminders", {
        headers: { authorization: "Bearer nope" },
      }),
    );
    expect(response.status).toBe(401);
    vi.unstubAllEnvs();
  });
});
