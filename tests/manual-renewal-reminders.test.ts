import { beforeEach, describe, expect, it, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

import {
  sendManualRenewalReminderAction,
  sendManualRenewalRemindersBulkAction,
} from "@/app/actions/manual-renewal-reminders";
import type { MemberDoc } from "@/lib/firestore/types";
import { assessManualRenewalReminderEligibility } from "@/lib/manual-renewal-reminders/eligibility";
import {
  sendManualRenewalReminderToMember,
  sendManualRenewalRemindersBulk,
} from "@/lib/manual-renewal-reminders/send";

const now = new Date("2026-10-04T12:00:00.000Z");

const { requireGym, findByIdAndGym, listAllWithStatus, claimMembershipExpiryReminder, manualReminderSettings } =
  vi.hoisted(() => ({
    requireGym: vi.fn(),
    findByIdAndGym: vi.fn(),
    listAllWithStatus: vi.fn(),
    claimMembershipExpiryReminder: vi.fn(),
    manualReminderSettings: {
      enabled: true,
      subject: "Membership reminder - {{gym_name}}",
      body: "Hi {{member_name}}",
    },
  }));

const sendTransactionalEmail = vi.fn();

vi.mock("@/lib/session", () => ({ requireGym }));
vi.mock("@/lib/email/send-transactional-email", () => ({
  sendTransactionalEmail: (...args: unknown[]) => sendTransactionalEmail(...args),
}));

vi.mock("@/lib/gym-profile", () => ({
  getGymProfilePlatform: vi.fn().mockResolvedValue({ name: "Iron Gym" }),
}));

vi.mock("@/lib/notification-settings/get-settings", () => ({
  getGymNotificationSettings: vi.fn().mockResolvedValue({
    gymId: "gym-a",
    manualRenewalReminder: manualReminderSettings,
  }),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    members: { findByIdAndGym, listAllWithStatus },
    notificationDeliveries: { claimMembershipExpiryReminder },
  }),
  platformContext: { kind: "platform" },
}));

function memberDoc(
  overrides: Partial<MemberDoc> & { id?: string } = {},
): MemberDoc & { id: string } {
  return {
    id: "member-1",
    gymId: "gym-a",
    memberNumber: 1,
    name: "Priya",
    nameLower: "priya",
    phone: "9999999999",
    phoneDigits: "9999999999",
    searchTokens: ["priya"],
    email: "priya@example.com",
    photoUrl: null,
    gender: "FEMALE",
    notes: null,
    isPt: false,
    trainerId: null,
    membershipPolicyAgreedText: null,
    membershipPolicyAgreedAt: null,
    portalEnabledAt: null,
    ageYears: null,
    heightCm: null,
    weightKg: null,
    fitnessGoal: null,
    pendingAmountTotal: 0,
    currentSubscriptionId: "sub-1",
    currentEndDate: Timestamp.fromDate(new Date("2026-10-01T00:00:00.000Z")),
    currentStartDate: Timestamp.fromDate(new Date("2026-09-01T00:00:00.000Z")),
    currentPackageName: "Monthly",
    addedByName: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  };
}

describe("assessManualRenewalReminderEligibility", () => {
  it("skips members without email", () => {
    expect(
      assessManualRenewalReminderEligibility(
        memberDoc({ email: null }),
        "expired",
        new Date("2026-10-01T00:00:00.000Z"),
        now,
      ),
    ).toBe("skipped_no_email");
  });

  it("skips stale subscription end dates", () => {
    expect(
      assessManualRenewalReminderEligibility(
        memberDoc(),
        "expired",
        new Date("2026-09-01T00:00:00.000Z"),
        now,
      ),
    ).toBe("skipped_stale_subscription");
  });
});

describe("sendManualRenewalReminderToMember", () => {
  beforeEach(() => {
    sendTransactionalEmail.mockReset();
    sendTransactionalEmail.mockResolvedValue(undefined);
    findByIdAndGym.mockReset();
    claimMembershipExpiryReminder.mockReset();
  });

  it("sends a personalized email to an eligible member", async () => {
    findByIdAndGym.mockResolvedValue(memberDoc());

    const result = await sendManualRenewalReminderToMember(
      "gym-a",
      "member-1",
      "expired",
      new Date("2026-10-01T00:00:00.000Z"),
      now,
    );

    expect(result.status).toBe("sent");
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "priya@example.com",
        subject: expect.stringContaining("Iron Gym"),
      }),
    );
    expect(claimMembershipExpiryReminder).not.toHaveBeenCalled();
  });

  it("skips members without email", async () => {
    findByIdAndGym.mockResolvedValue(memberDoc({ email: "  " }));

    const result = await sendManualRenewalReminderToMember(
      "gym-a",
      "member-1",
      "expired",
      new Date("2026-10-01T00:00:00.000Z"),
      now,
    );

    expect(result.status).toBe("skipped_no_email");
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("continues bulk sends when one recipient fails", async () => {
    listAllWithStatus.mockResolvedValue([
      {
        id: "member-1",
        gymId: "gym-a",
        memberNumber: 1,
        name: "Priya",
        phone: "1",
        email: "priya@example.com",
        photoUrl: null,
        gender: "FEMALE",
        packageName: "Monthly",
        currentSubscriptionId: "sub-1",
        endDate: new Date("2026-10-01T00:00:00.000Z"),
        status: "EXPIRED",
        subsAmount: null,
        paidAmount: null,
        pendingAmount: 0,
        addedByName: null,
        isPt: false,
        trainerId: null,
        trainerName: null,
        createdAt: now,
        startDate: null,
      },
      {
        id: "member-2",
        gymId: "gym-a",
        memberNumber: 2,
        name: "Arjun",
        phone: "2",
        email: "arjun@example.com",
        photoUrl: null,
        gender: "MALE",
        packageName: "Monthly",
        currentSubscriptionId: "sub-2",
        endDate: new Date("2026-10-01T00:00:00.000Z"),
        status: "EXPIRED",
        subsAmount: null,
        paidAmount: null,
        pendingAmount: 0,
        addedByName: null,
        isPt: false,
        trainerId: null,
        trainerName: null,
        createdAt: now,
        startDate: null,
      },
    ]);

    findByIdAndGym.mockImplementation(
      async (_ctx: unknown, memberId: string) => {
        if (memberId === "member-1") return memberDoc({ id: "member-1" });
        return memberDoc({ id: "member-2", name: "Arjun", email: "arjun@example.com" });
      },
    );

    sendTransactionalEmail
      .mockRejectedValueOnce(new Error("resend down"))
      .mockResolvedValueOnce(undefined);

    const summary = await sendManualRenewalRemindersBulk("gym-a", "expired", "", now);

    expect(summary.sent).toBe(1);
    expect(summary.failed).toBe(1);
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(2);
    expect(sendTransactionalEmail.mock.calls[1]?.[0].to).toBe("arjun@example.com");
    expect(sendTransactionalEmail.mock.calls[0]?.[0].html).toContain("Priya");
    expect(sendTransactionalEmail.mock.calls[1]?.[0].html).toContain("Arjun");
  });
});

describe("manual renewal reminder actions", () => {
  beforeEach(() => {
    requireGym.mockReset();
    findByIdAndGym.mockReset();
    sendTransactionalEmail.mockReset();
    sendTransactionalEmail.mockResolvedValue(undefined);
    claimMembershipExpiryReminder.mockReset();
  });

  it("allows owners to send to one member", async () => {
    requireGym.mockResolvedValue({
      id: "owner-1",
      gymId: "gym-a",
      role: "OWNER",
    });
    findByIdAndGym.mockResolvedValue(memberDoc());

    const result = await sendManualRenewalReminderAction(
      "member-1",
      new Date("2026-10-01T00:00:00.000Z").toISOString(),
      "expired",
    );

    expect(result.ok).toBe(true);
    expect(sendTransactionalEmail).toHaveBeenCalled();
  });

  it("rejects non-owner sends", async () => {
    requireGym.mockResolvedValue({
      id: "staff-1",
      gymId: "gym-a",
      role: "STAFF",
    });

    const result = await sendManualRenewalReminderAction(
      "member-1",
      new Date("2026-10-01T00:00:00.000Z").toISOString(),
      "expired",
    );

    expect(result.ok).toBe(false);
    expect(sendTransactionalEmail).not.toHaveBeenCalled();
  });

  it("enforces gym scoping on the server", async () => {
    requireGym.mockResolvedValue({
      id: "owner-1",
      gymId: "gym-a",
      role: "OWNER",
    });
    findByIdAndGym.mockResolvedValue(null);

    const result = await sendManualRenewalReminderAction(
      "member-other-gym",
      new Date("2026-10-01T00:00:00.000Z").toISOString(),
      "expired",
    );

    expect(result.ok).toBe(false);
  });

  it("blocks duplicate in-flight single sends", async () => {
    requireGym.mockResolvedValue({
      id: "owner-1",
      gymId: "gym-a",
      role: "OWNER",
    });
    findByIdAndGym.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return memberDoc();
    });

    const first = sendManualRenewalReminderAction(
      "member-1",
      new Date("2026-10-01T00:00:00.000Z").toISOString(),
      "expired",
    );
    const second = sendManualRenewalReminderAction(
      "member-1",
      new Date("2026-10-01T00:00:00.000Z").toISOString(),
      "expired",
    );

    const results = await Promise.all([first, second]);
    expect(results.some((r) => !r.ok)).toBe(true);
  });

  it("blocks duplicate in-flight bulk sends", async () => {
    requireGym.mockResolvedValue({
      id: "owner-1",
      gymId: "gym-a",
      role: "OWNER",
    });
    listAllWithStatus.mockResolvedValue([]);

    const first = sendManualRenewalRemindersBulkAction("expired", "");
    const second = sendManualRenewalRemindersBulkAction("expired", "");

    const results = await Promise.all([first, second]);
    expect(results.some((r) => !r.ok)).toBe(true);
  });
});
