import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFirestoreDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import type { MemberContext } from "@/lib/firestore/context";
import { completeWorkoutSessionRecord } from "@/lib/firestore/workout-session-operations";
import type { WorkoutSessionDoc } from "@/lib/firestore/types";
import { WorkoutEmptyConfirmationRequiredError } from "@/lib/workout-tracking/workout-completion-errors";

const mockWorkoutSessions = {
  getActiveSessionForMember: vi.fn(),
  completeSessionInTransaction: vi.fn(),
  completeSessionWriteInTransaction: vi.fn(),
  abandonSessionInTransaction: vi.fn(),
};

const mockMembers = {
  findByIdAndGym: vi.fn(),
};

const attendanceQueryRef = { path: "attendance/query-member-date" };
const memberRef = { path: "members/member-1" };

const mockAttendance = {
  recordMemberVisitIfAbsentInTransaction: vi.fn(),
  memberDateAttendanceQuery: vi.fn(() => attendanceQueryRef),
  writeMemberVisitIfAbsentInTransaction: vi.fn(() => true),
};

vi.mock("@/lib/firebase/admin", () => ({
  getFirestoreDb: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    workoutSessions: mockWorkoutSessions,
    members: mockMembers,
    attendance: mockAttendance,
  }),
}));

const memberCtx: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-1",
};

function ts(iso = "2026-09-22T10:00:00.000Z") {
  return Timestamp.fromDate(new Date(iso));
}

function sessionDoc(
  overrides: Partial<WorkoutSessionDoc> = {},
): WorkoutSessionDoc {
  return {
    gymId: "gym-a",
    memberId: "member-1",
    workoutPlanId: "plan-1",
    workoutPlanDayId: "day-1",
    status: "IN_PROGRESS",
    startedAt: ts(),
    completedAt: null,
    durationSeconds: null,
    exercises: [
      {
        id: "sess-ex-a",
        workoutPlanExerciseId: "row-a",
        exerciseId: "ex-bench",
        customName: null,
        targetReps: "8",
        sortOrder: 0,
        sets: [
          {
            setNumber: 1,
            weightKg: 60,
            durationSeconds: null,
            loggedAt: ts("2026-09-22T10:05:00.000Z"),
          },
        ],
      },
    ],
    ...overrides,
  };
}

function mockFirestoreForCompletion(
  session: WorkoutSessionDoc,
  options?: { trackOps?: string[] },
) {
  const sessionRef = { path: `${COLLECTIONS.workoutSessions}/session-1` };
  const tx = {
    get: vi.fn(async (ref: { path: string }) => {
      options?.trackOps?.push(`read:${ref.path}`);
      if (ref.path === sessionRef.path) {
        return { exists: true, data: () => session };
      }
      if (ref.path === attendanceQueryRef.path) {
        return { empty: true, docs: [] };
      }
      if (ref.path === memberRef.path) {
        return {
          exists: true,
          data: () => ({ gymId: "gym-a", lastAttendanceAt: null }),
        };
      }
      throw new Error(`Unexpected tx.get: ${ref.path}`);
    }),
  };

  vi.mocked(getFirestoreDb).mockReturnValue({
    collection: vi.fn((name: string) => ({
      doc: vi.fn((id: string) => {
        if (name === COLLECTIONS.workoutSessions && id === "session-1") {
          return sessionRef;
        }
        if (name === COLLECTIONS.members && id === "member-1") {
          return memberRef;
        }
        return { path: `${name}/${id}` };
      }),
    })),
    runTransaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
  } as never);

  mockWorkoutSessions.completeSessionWriteInTransaction.mockImplementation(() => {
    options?.trackOps?.push("write:session");
  });
  mockAttendance.writeMemberVisitIfAbsentInTransaction.mockImplementation(() => {
    options?.trackOps?.push("write:attendance");
    return true;
  });

  return { tx };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMembers.findByIdAndGym.mockResolvedValue({
    id: "member-1",
    gymId: "gym-a",
    memberNumber: 1,
    name: "Rahul Kumar",
  });
});

describe("completeWorkoutSessionRecord", () => {
  it("requires confirmation when finishing with zero logged sets", async () => {
    mockWorkoutSessions.getActiveSessionForMember.mockResolvedValue({
      id: "session-1",
      ...sessionDoc({ exercises: [{ ...sessionDoc().exercises[0], sets: [] }] }),
    });

    await expect(
      completeWorkoutSessionRecord(memberCtx, "session-1"),
    ).rejects.toBeInstanceOf(WorkoutEmptyConfirmationRequiredError);

    expect(mockWorkoutSessions.abandonSessionInTransaction).not.toHaveBeenCalled();
    expect(mockWorkoutSessions.completeSessionWriteInTransaction).not.toHaveBeenCalled();
  });

  it("abandons session without attendance when empty finish is confirmed", async () => {
    mockWorkoutSessions.getActiveSessionForMember.mockResolvedValue({
      id: "session-1",
      ...sessionDoc({ exercises: [{ ...sessionDoc().exercises[0], sets: [] }] }),
    });
    vi.mocked(getFirestoreDb).mockReturnValue({
      runTransaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn({})),
    } as never);

    const result = await completeWorkoutSessionRecord(memberCtx, "session-1", {
      confirmEmptyFinish: true,
    });

    expect(result).toEqual({ outcome: "abandoned", attendanceRecorded: false });
    expect(mockWorkoutSessions.abandonSessionInTransaction).toHaveBeenCalled();
    expect(mockAttendance.writeMemberVisitIfAbsentInTransaction).not.toHaveBeenCalled();
  });

  it("reads session, attendance, and member before any writes", async () => {
    const doc = sessionDoc();
    mockWorkoutSessions.getActiveSessionForMember.mockResolvedValue({
      id: "session-1",
      ...doc,
    });
    const ops: string[] = [];
    mockFirestoreForCompletion(doc, { trackOps: ops });

    await completeWorkoutSessionRecord(memberCtx, "session-1");

    expect(ops).toEqual([
      `read:${COLLECTIONS.workoutSessions}/session-1`,
      "read:attendance/query-member-date",
      "read:members/member-1",
      "write:session",
      "write:attendance",
    ]);
  });

  it("completes session and records attendance when at least one set is logged", async () => {
    const doc = sessionDoc();
    mockWorkoutSessions.getActiveSessionForMember.mockResolvedValue({
      id: "session-1",
      ...doc,
    });
    mockFirestoreForCompletion(doc);

    const result = await completeWorkoutSessionRecord(memberCtx, "session-1");

    expect(result.outcome).toBe("completed");
    expect(result.attendanceRecorded).toBe(true);
    expect(mockWorkoutSessions.completeSessionWriteInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      memberCtx,
      "gym-a",
      "session-1",
      expect.any(Number),
    );
    expect(mockAttendance.writeMemberVisitIfAbsentInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      memberCtx,
      "gym-a",
      expect.objectContaining({ id: "member-1", gymId: "gym-a" }),
      expect.any(Date),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      "workout",
      expect.objectContaining({ empty: true }),
      expect.objectContaining({ exists: true }),
    );
  });

  it("is idempotent when session is already completed (no second attendance write)", async () => {
    const doc = sessionDoc({ status: "COMPLETED", completedAt: ts() });
    mockWorkoutSessions.getActiveSessionForMember.mockResolvedValue({
      id: "session-1",
      ...doc,
    });
    mockFirestoreForCompletion(doc);

    const result = await completeWorkoutSessionRecord(memberCtx, "session-1");

    expect(result).toEqual({ outcome: "completed", attendanceRecorded: false });
    expect(mockWorkoutSessions.completeSessionWriteInTransaction).not.toHaveBeenCalled();
    expect(mockAttendance.writeMemberVisitIfAbsentInTransaction).not.toHaveBeenCalled();
  });
});
