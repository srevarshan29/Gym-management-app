import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { attendanceDateKey } from "@/lib/attendance/date-key";
import { checkInMemberByNumber } from "@/lib/attendance/check-in";
import { buildLegacyAttendanceDayDocId } from "@/lib/attendance/delivery-id";
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

describe("buildLegacyAttendanceDayDocId", () => {
  it("documents legacy deterministic ids", () => {
    expect(buildLegacyAttendanceDayDocId("gym-a", "m1", "2026-10-04")).toBe(
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

  it("checks in a valid member by number (Enter submits the same FormData as the button)", async () => {
    findByMemberNumber.mockResolvedValue({
      id: "m1",
      gymId: "gym-a",
      memberNumber: 72,
      name: "Rahul Kumar",
      gender: "MALE",
      photoUrl: null,
      currentEndDate: Timestamp.fromDate(new Date("2026-12-01T00:00:00.000Z")),
    });
    recordManualCheckIn.mockResolvedValue({
      status: "success",
      memberId: "m1",
      memberNumber: 72,
      memberName: "Rahul Kumar",
      checkedInAt: new Date("2026-10-04T18:15:00.000Z"),
      photoUrl: null,
      gender: "MALE",
    });

    const result = await checkInMemberByNumber(
      { members, attendance } as never,
      ctx,
      "gym-a",
      "72",
      new Date("2026-10-04T18:15:00.000Z"),
    );

    expect(findByMemberNumber).toHaveBeenCalledWith(ctx, "gym-a", 72);
    expect(recordManualCheckIn).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("success");
  });

  it("allows multiple check-ins on the same calendar day", async () => {
    findByMemberNumber.mockResolvedValue({
      id: "m1",
      gymId: "gym-a",
      memberNumber: 1,
      name: "Rahul Kumar",
      gender: "MALE",
      photoUrl: null,
      currentEndDate: Timestamp.fromDate(new Date("2026-12-01T00:00:00.000Z")),
    });
    recordManualCheckIn
      .mockResolvedValueOnce({
        status: "success",
        memberId: "m1",
        memberNumber: 1,
        memberName: "Rahul Kumar",
        checkedInAt: new Date("2026-10-04T07:00:00.000Z"),
        photoUrl: null,
        gender: "MALE",
      })
      .mockResolvedValueOnce({
        status: "success",
        memberId: "m1",
        memberNumber: 1,
        memberName: "Rahul Kumar",
        checkedInAt: new Date("2026-10-04T17:30:00.000Z"),
        photoUrl: null,
        gender: "MALE",
      });

    const morning = await checkInMemberByNumber(
      { members, attendance } as never,
      ctx,
      "gym-a",
      "1",
      new Date("2026-10-04T07:00:00.000Z"),
    );
    const evening = await checkInMemberByNumber(
      { members, attendance } as never,
      ctx,
      "gym-a",
      "1",
      new Date("2026-10-04T17:30:00.000Z"),
    );

    expect(morning.status).toBe("success");
    expect(evening.status).toBe("success");
    expect(recordManualCheckIn).toHaveBeenCalledTimes(2);
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
      gender: "MALE",
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
});

describe("recordManualCheckIn transaction", () => {
  it("creates a new attendance document on each visit", async () => {
    const set = vi.fn();
    const update = vi.fn();
    const attendanceRefs: { id: string }[] = [];
    const memberRef = { path: "members/m1" };

    const tx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          gymId: "gym-a",
          lastAttendanceAt: null,
          photoUrl: null,
          gender: "MALE",
        }),
      }),
      set,
      update,
    };

    const db = {
      collection: vi.fn((name: string) => ({
        doc: vi.fn((id?: string) => {
          if (name !== "attendance") return memberRef;
          const ref = { path: `attendance/${id ?? `auto-${attendanceRefs.length}`}`, id: id ?? `auto-${attendanceRefs.length}` };
          if (!id) attendanceRefs.push(ref);
          return ref;
        }),
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
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ path: "attendance/auto-0" }),
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

  it("creates separate records for two check-ins the same day", async () => {
    const set = vi.fn();
    const update = vi.fn();
    let autoId = 0;
    const memberRef = { path: "members/m1" };

    const tx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          gymId: "gym-a",
          lastAttendanceAt: Timestamp.fromDate(new Date("2026-10-04T07:00:00.000Z")),
          photoUrl: null,
          gender: "MALE",
        }),
      }),
      set,
      update,
    };

    const db = {
      collection: vi.fn((name: string) => ({
        doc: vi.fn((id?: string) => {
          if (name !== "attendance") return memberRef;
          const docId = id ?? `visit-${autoId++}`;
          return { path: `attendance/${docId}`, id: docId };
        }),
      })),
      runTransaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
        fn(tx),
      ),
    };

    const repo = new AttendanceRepository(db as never);
    const ctx = { kind: "staff" as const, gymId: "gym-a", userId: "s1", role: "STAFF" as const };
    const member = {
      id: "m1",
      gymId: "gym-a",
      memberNumber: 1,
      name: "Rahul Kumar",
    };

    await repo.recordManualCheckIn(
      ctx,
      "gym-a",
      member,
      new Date("2026-10-04T17:30:00.000Z"),
      "2026-10-04",
    );
    await repo.recordManualCheckIn(
      ctx,
      "gym-a",
      member,
      new Date("2026-10-04T20:15:00.000Z"),
      "2026-10-04",
    );

    expect(set).toHaveBeenCalledTimes(2);
    const secondUpdate = update.mock.calls[1]?.[1];
    expect(secondUpdate.lastAttendanceAt).toEqual(
      Timestamp.fromDate(new Date("2026-10-04T20:15:00.000Z")),
    );
  });
});

describe("AttendanceRepository list queries", () => {
  it("maps today's rows including multiple visits per member", () => {
    const repo = new AttendanceRepository({} as never);
    const rows = repo.mapListItems([
      {
        id: "a1",
        gymId: "gym-a",
        memberId: "m1",
        memberNumber: 1,
        memberName: "Rahul",
        checkedInAt: Timestamp.fromDate(new Date("2026-10-04T07:00:00.000Z")),
        dateKey: "2026-10-04",
        method: "manual",
      },
      {
        id: "a2",
        gymId: "gym-a",
        memberId: "m1",
        memberNumber: 1,
        memberName: "Rahul",
        checkedInAt: Timestamp.fromDate(new Date("2026-10-04T17:30:00.000Z")),
        dateKey: "2026-10-04",
        method: "manual",
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe("a1");
    expect(rows[1]?.id).toBe("a2");
  });
});
