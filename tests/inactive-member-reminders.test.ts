import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildInactiveMemberDeliveryId } from "@/lib/inactive-member-reminders/delivery-id";
import {
  assessInactiveMemberEligibility,
  daysSinceLastAttendance,
} from "@/lib/inactive-member-reminders/eligibility";
import { processInactiveMemberCandidate } from "@/lib/inactive-member-reminders/process-candidate";
import { buildInactiveMemberEmailFromSettings } from "@/lib/notification-settings/inactive-member-email";
import {
  DEFAULT_INACTIVE_MEMBER_EMAIL,
  defaultGymNotificationSettings,
} from "@/lib/notification-settings/defaults";
import { areAutomaticEmailNotificationsEnabled } from "@/lib/notification-settings/automatic-email";
import type { MemberDoc } from "@/lib/firestore/types";

const now = new Date("2026-10-11T12:00:00.000Z");

function member(
  overrides: Partial<MemberDoc> & { id: string },
): MemberDoc & { id: string } {
  return {
    gymId: "gym-a",
    memberNumber: 1,
    name: "Rahul Kumar",
    nameLower: "rahul kumar",
    phone: "9999999999",
    phoneDigits: "9999999999",
    searchTokens: [],
    email: "rahul@example.com",
    photoUrl: null,
    gender: "MALE",
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
    currentStartDate: Timestamp.fromDate(new Date("2026-09-01T00:00:00.000Z")),
    currentEndDate: Timestamp.fromDate(new Date("2026-12-01T00:00:00.000Z")),
    currentPackageName: "Monthly",
    addedByName: null,
    createdAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z")),
    updatedAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z")),
    lastAttendanceAt: Timestamp.fromDate(new Date("2026-10-01T12:00:00.000Z")),
    ...overrides,
  };
}

describe("assessInactiveMemberEligibility", () => {
  it("selects member inactive after configured threshold", () => {
    const m = member({ id: "m1" });
    expect(
      assessInactiveMemberEligibility(m, "gym-a", 7, now),
    ).toBe("eligible");
    expect(daysSinceLastAttendance(m.lastAttendanceAt!.toDate(), now)).toBe(10);
  });

  it("skips active member with recent attendance", () => {
    const m = member({
      id: "m1",
      lastAttendanceAt: Timestamp.fromDate(new Date("2026-10-10T08:00:00.000Z")),
    });
    expect(
      assessInactiveMemberEligibility(m, "gym-a", 7, now),
    ).toBe("skipped_not_inactive_enough");
  });

  it("skips expired member", () => {
    const m = member({
      id: "m1",
      currentEndDate: Timestamp.fromDate(new Date("2026-09-01T00:00:00.000Z")),
    });
    expect(assessInactiveMemberEligibility(m, "gym-a", 7, now)).toBe(
      "skipped_not_active",
    );
  });

  it("skips member without email", () => {
    const m = member({ id: "m1", email: null });
    expect(assessInactiveMemberEligibility(m, "gym-a", 7, now)).toBe(
      "skipped_no_email",
    );
  });

  it("isolates gyms", () => {
    const m = member({ id: "m1", gymId: "gym-b" });
    expect(assessInactiveMemberEligibility(m, "gym-a", 7, now)).toBe(
      "skipped_wrong_gym",
    );
  });
});

describe("buildInactiveMemberDeliveryId", () => {
  it("keys delivery to gym, member, threshold, and last visit period", () => {
    expect(
      buildInactiveMemberDeliveryId({
        gymId: "gym-a",
        memberId: "m1",
        inactiveAfterDays: 7,
        lastAttendancePeriodMs: 1_000,
      }),
    ).toBe("gym-a__m1__INACTIVE__7__1000");
  });

  it("allows a new period after member checks in again", () => {
    const first = buildInactiveMemberDeliveryId({
      gymId: "gym-a",
      memberId: "m1",
      inactiveAfterDays: 7,
      lastAttendancePeriodMs: 100,
    });
    const second = buildInactiveMemberDeliveryId({
      gymId: "gym-a",
      memberId: "m1",
      inactiveAfterDays: 7,
      lastAttendancePeriodMs: 200,
    });
    expect(first).not.toBe(second);
  });
});

describe("processInactiveMemberCandidate", () => {
  const settings = {
    ...defaultGymNotificationSettings("gym-a"),
    inactiveMemberEmail: { ...DEFAULT_INACTIVE_MEMBER_EMAIL, enabled: true },
    inactiveAfterDays: 7 as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not send duplicate on second automation run for same period", async () => {
    const claim = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const m = member({ id: "m1" });
    const deps = {
      claimDelivery: claim,
      releaseDelivery: vi.fn(),
      sendEmail,
    };

    const first = await processInactiveMemberCandidate(
      m,
      settings,
      "Iron Gym",
      now,
      deps,
    );
    const second = await processInactiveMemberCandidate(
      m,
      settings,
      "Iron Gym",
      now,
      deps,
    );

    expect(first).toBe("sent");
    expect(second).toBe("skipped_duplicate");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("tracks failed sends by releasing delivery claim", async () => {
    const releaseDelivery = vi.fn().mockResolvedValue(undefined);
    const deps = {
      claimDelivery: vi.fn().mockResolvedValue(true),
      releaseDelivery,
      sendEmail: vi.fn().mockRejectedValue(new Error("SMTP down")),
    };
    const result = await processInactiveMemberCandidate(
      member({ id: "m1" }),
      settings,
      "Iron Gym",
      now,
      deps,
    );
    expect(result).toBe("send_failed");
    expect(releaseDelivery).toHaveBeenCalled();
  });

  it("skips when channel disabled in automated mode", async () => {
    const result = await processInactiveMemberCandidate(
      member({ id: "m1" }),
      {
        ...settings,
        inactiveMemberEmail: { ...settings.inactiveMemberEmail, enabled: false },
      },
      "Iron Gym",
      now,
      {
        claimDelivery: vi.fn(),
        releaseDelivery: vi.fn(),
        sendEmail: vi.fn(),
      },
    );
    expect(result).toBe("skipped_disabled");
  });

  it("allows manual send when channel enabled even if automatic master is off", () => {
    expect(
      areAutomaticEmailNotificationsEnabled({
        automaticEmailNotificationsEnabled: false,
      }),
    ).toBe(false);
    expect(settings.inactiveMemberEmail.enabled).toBe(true);
  });
});

describe("buildInactiveMemberEmailFromSettings", () => {
  it("renders personalization variables", () => {
    const { subject, text } = buildInactiveMemberEmailFromSettings(
      DEFAULT_INACTIVE_MEMBER_EMAIL,
      {
        memberName: "Rahul Kumar",
        gymName: "Iron Gym",
        daysInactive: 10,
      },
    );
    expect(subject).toContain("Iron Gym");
    expect(text).toContain("Rahul Kumar");
    expect(text).toContain("10 days");
  });
});

describe("member returns and becomes inactive again", () => {
  it("becomes eligible again after a new lastAttendanceAt period", () => {
    const afterReturn = member({
      id: "m1",
      lastAttendanceAt: Timestamp.fromDate(new Date("2026-10-05T12:00:00.000Z")),
    });
    const later = new Date("2026-10-20T12:00:00.000Z");
    expect(
      assessInactiveMemberEligibility(afterReturn, "gym-a", 7, later),
    ).toBe("eligible");
  });
});
