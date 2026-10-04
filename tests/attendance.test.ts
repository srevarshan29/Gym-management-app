import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { attendanceDateKey } from "@/lib/attendance/date-key";
import { checkInMemberByNumber } from "@/lib/attendance/check-in";
import { buildAttendanceDayDocId } from "@/lib/attendance/delivery-id";
import {
  maxLastAttendanceAt,
  shouldUpdateLastAttendanceAt,
} from "@/lib/attendance/last-attendance";
import {
  formatMemberNumberForMessage,
  parseMemberNumberInput,
} from "@/lib/attendance/member-number-input";
import { isMembershipActiveForAttendance } from "@/lib/attendance/membership-active";
import { AttendanceRepository } from "@/lib/firestore/repositories/attendance";
import type { AttendanceDoc } from "@/lib/firestore/types";

describe("parseMemberNumberInput", () => {
  it("parses plain numeric input", () => {
    expect(parseMemberNumberInput("72")).toBe(72);
  });

  it("parses formatted member numbers", () => {
    expect(parseMemberNumberInput("#0072")).toBe(72);
  });
});

describe("formatMemberNumberForMessage", () => {
  it("formats member numbers like receipts", () => {
    expect(formatMemberNumberForMessage(72)).toBe("#0072");
  });
});

describe("attendanceDateKey", () => {
  it("returns YYYY-MM-DD in gym timezone", () => {
    const key = attendanceDateKey(new Date("2026-10-04T12:00:00.000Z"));
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isMembershipActiveForAttendance", () => {
  it("allows active and expiring soon memberships", () => {
    const now = new Date("2026-10-04T12:00:00.000Z");
    expect(
      isMembershipActiveForAttendance(new Date("2026-11-01T00:00:00.000Z"), now),
    ).toBe(true);
    expect(
      isMembershipActiveForAttendance(new Date("2026-10-06T00:00:00.000Z"), now),
    ).toBe(true);
  });

  it("rejects expired memberships", () => {
    const now = new Date("2026-10-04T12:00:00.000Z");
    expect(
      isMembershipActiveForAttendance(new Date("2026-10-01T00:00:00.000Z"), now),
    ).toBe(false);
    expect(isMembershipActiveForAttendance(null, now)).toBe(false);
  });
});

describe("buildAttendanceDayDocId", () => {
  it("is deterministic per gym member and date", () => {
    expect(buildAttendanceDayDocId("gym-a", "m1", "2026-10-04")).toBe(
      "gym-a__m1__2026-10-04",
    );
  });
});

describe("lastAttendanceAt merge", () => {
  it("updates when no prior value exists", () => {
    const candidate = new Date("2026-10-04T18:00:00.000Z");
    expect(shouldUpdateLastAttendanceAt(null, candidate)).toBe(true);
    expect(maxLastAttendanceAt(null, candidate)).toEqual(candidate);
  });

  it("never moves lastAttendanceAt backwards", () => {
    const existing = new Date("2026-10-04T18:00:00.000Z");
    const older = new Date("2026-10-03T10:00:00.000Z");
    expect(shouldUpdateLastAttendanceAt(existing, older)).toBe(false);
    expect(maxLastAttendanceAt(existing, older)).toEqual(existing);
  });

  it("moves forward when candidate is newer", () => {
    const existing = new Date("2026-10-03T10:00:00.000Z");
    const newer = new Date("2026-10-04T18:00:00.000Z");
    expect(shouldUpdateLastAttendanceAt(existing, newer)).toBe(true);
    expect(maxLastAttendanceAt(existing, newer)).toEqual(newer);
  });
});

describe("AttendanceRepository.supportedMethods", () => {
  it("supports future methods without schema redesign", () => {
    expect(AttendanceRepository.supportedMethods()).toEqual([
      "manual",
      "biometric",
      "qr",
    ]);
  });
});

describe("checkInMemberByNumber", () => {
  const ctx = { kind: "staff" as const, gymId: "gym-a", userId: "staff-1", role: "STAFF" as const };
  const findByMemberNumber = vi.fn();
  const recordManualCheckIn = vi.fn();
  const members = { findByMemberNumber };
  const attendance = { recordManualCheckIn };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks in a valid member by number", async () => {
    findByMemberNumber.mockResolvedValue({
      id: "m1",
      gymId: "gym-a",
      memberNumber: 72,
      name: "Rahul Kumar",
      currentEndDate: Timestamp.fromDate(new Date("2026-12-01T00:00:00.000Z")),
    });
    recordManualCheckIn.mockResolvedValue({
      status: "success",
      memberId: "m1",
      memberNumber: 72,
      memberName: "Rahul Kumar",
      checkedInAt: new Date("2026-10-04T18:15:00.000Z"),
    });

    const result = await checkInMemberByNumber(
      { members, attendance } as never,
      ctx,
      "gym-a",
      "72",
      new Date("2026-10-04T18:15:00.000Z"),
    );

    expect(findByMemberNumber).toHaveBeenCalledWith(ctx, "gym-a", 72);
    expect(recordManualCheckIn).toHaveBeenCalled();
    expect(result.status).toBe("success");
  });

  it("scopes member lookup by gymId", async () => {
    findByMemberNumber.mockResolvedValue(null);

    const result = await checkInMemberByNumber(
      { members, attendance } as never,
      ctx,
      "gym-a",
      "72",
    );

    expect(findByMemberNumber).toHaveBeenCalledWith(ctx, "gym-a", 72);
    expect(result).toEqual({
      status: "not_found",
      memberNumber: 72,
      memberNumberLabel: "#0072",
    });
  });

  it("returns not found for unknown member", async () => {
    findByMemberNumber.mockResolvedValue(null);
    const result = await checkInMemberByNumber(
      { members, attendance } as never,
      ctx,
      "gym-a",
      "9999",
    );
    expect(result.status).toBe("not_found");
    expect(recordManualCheckIn).not.toHaveBeenCalled();
  });

  it("blocks expired membership", async () => {
    findByMemberNumber.mockResolvedValue({
      id: "m1",
      gymId: "gym-a",
      memberNumber: 72,
      name: "Rahul Kumar",
      currentEndDate: Timestamp.fromDate(new Date("2026-09-01T00:00:00.000Z")),
    });

    const result = await checkInMemberByNumber(
      { members, attendance } as never,
      ctx,
      "gym-a",
      "72",
      new Date("2026-10-04T18:15:00.000Z"),
    );

    expect(result.status).toBe("membership_expired");
    expect(recordManualCheckIn).not.toHaveBeenCalled();
  });

  it("returns duplicate same-day check-in from repository", async () => {
    findByMemberNumber.mockResolvedValue({
      id: "m1",
      gymId: "gym-a",
      memberNumber: 72,
      name: "Rahul Kumar",
      currentEndDate: Timestamp.fromDate(new Date("2026-12-01T00:00:00.000Z")),
    });
    recordManualCheckIn.mockResolvedValue({
      status: "already_checked_in",
      memberId: "m1",
      memberNumber: 72,
      memberName: "Rahul Kumar",
      checkedInAt: new Date("2026-10-04T18:15:00.000Z"),
    });

    const result = await checkInMemberByNumber(
      { members, attendance } as never,
      ctx,
      "gym-a",
      "72",
    );
    expect(result.status).toBe("already_checked_in");
  });
});

describe("recordManualCheckIn transaction", () => {
  it("stores memberNumber on attendance records", async () => {
    const set = vi.fn();
    const update = vi.fn();
    const attendanceRef = { path: "attendance/id" };
    const memberRef = { path: "members/m1" };

    const tx = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({
            gymId: "gym-a",
            lastAttendanceAt: null,
          }),
        }),
      set,
      update,
    };

    const db = {
      collection: vi.fn((name: string) => ({
        doc: vi.fn((id: string) =>
          name === "attendance" ? attendanceRef : memberRef,
        ),
      })),
      runTransaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    const repo = new AttendanceRepository(db as never);
    const checkedInAt = new Date("2026-10-04T18:15:00.000Z");
    const result = await repo.recordManualCheckIn(
      { kind: "staff", gymId: "gym-a", userId: "s1", role: "STAFF" },
      "gym-a",
      {
        id: "m1",
        gymId: "gym-a",
        memberNumber: 72,
        name: "Rahul Kumar",
      },
      checkedInAt,
      "2026-10-04",
    );

    expect(result.status).toBe("success");
    expect(set).toHaveBeenCalledWith(
      attendanceRef,
      expect.objectContaining({
        memberNumber: 72,
        method: "manual",
        memberName: "Rahul Kumar",
      } satisfies Partial<AttendanceDoc>),
    );
    expect(update).toHaveBeenCalledWith(
      memberRef,
      expect.objectContaining({
        lastAttendanceAt: Timestamp.fromDate(checkedInAt),
      }),
    );
  });
});
