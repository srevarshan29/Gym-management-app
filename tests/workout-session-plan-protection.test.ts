import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFirestoreDb } from "@/lib/firebase/admin";
import type { MemberContext } from "@/lib/firestore/context";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { WorkoutSessionsRepository } from "@/lib/firestore/repositories/workout-sessions";
import {
  ActiveSessionPlanEditBlockedError,
  analyzePlanRowChanges,
  validateWorkoutPlanSaveForActiveSession,
} from "@/lib/firestore/workout-plan-operations";
import {
  completeWorkoutSessionRecord,
  logWorkoutSetRecord,
  startWorkoutSessionRecord,
} from "@/lib/firestore/workout-session-operations";
import type {
  WorkoutPlanDoc,
  WorkoutSessionDoc,
  WorkoutSessionExerciseEmbedded,
} from "@/lib/firestore/types";
import { getExerciseProgressData, getMemberExerciseOptions } from "@/lib/workout-tracking/progress";
import { getPreviousSetsForSessionExercises } from "@/lib/workout-tracking/previous-sets";
import {
  getSessionExerciseSnapshot,
  hasSessionExerciseSnapshot,
  matchesSessionExerciseIdentity,
  resolveSessionExerciseContext,
} from "@/lib/workout-tracking/session-exercise-identity";
import { buildPlanExerciseMap } from "@/lib/workout-tracking/session-plan";
import { getExerciseLibraryMapByIds } from "@/lib/workout-tracking/exercise-library";
import { getActiveWorkoutSession } from "@/lib/workout-tracking/sessions";

vi.mock("@/lib/firebase/admin", () => ({
  getFirestoreDb: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    workoutPlans: mockWorkoutPlans,
    workoutSessions: mockWorkoutSessions,
    customExercises: mockCustomExercises,
  }),
  platformContext: { kind: "platform" },
}));

vi.mock("@/lib/workout-tracking/exercise-library", () => ({
  getExerciseLibraryMapByIds: vi.fn(async (_gymId: string, ids: string[]) =>
    new Map(
      ids.map((id) => [
        id,
        {
          name: id === "ex-bench" ? "Bench Press" : "Squat",
          muscleGroup: "CHEST",
          trackingType: "WEIGHTED",
          isSeeded: true,
        },
      ]),
    ),
  ),
  getExercisesByIds: vi.fn(async (_gymId: string, ids: string[]) =>
    ids.map((id) => ({
      id,
      name: id === "ex-bench" ? "Bench Press" : "Squat",
      muscleGroup: "CHEST",
      defaultSets: 3,
      defaultReps: "8",
      defaultTempo: null,
      defaultRestSeconds: 90,
      trackingType: "WEIGHTED" as const,
      isSeeded: true,
      exerciseSource: "SEEDED" as const,
      catalogId: null,
      importedCatalogVersion: null,
      media: {
        primaryImageUrl: null,
        secondaryImageUrl: null,
        thumbnailUrl: null,
      },
      hasMedia: false,
    })),
  ),
}));

const mockWorkoutPlans = {
  findByMemberId: vi.fn(),
  getById: vi.fn(),
};

const mockWorkoutSessions = {
  findActiveSession: vi.fn(),
  createSession: vi.fn(),
  upsertSetLogInTransaction: vi.fn(),
  listCompletedForMember: vi.fn(),
  getActiveSessionForMember: vi.fn(),
  completeSessionInTransaction: vi.fn(),
};

const mockCustomExercises = {
  getByIds: vi.fn(),
};

const memberCtx: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-1",
};

function ts(iso = "2026-09-20T00:00:00.000Z") {
  return Timestamp.fromDate(new Date(iso));
}

function planRow(
  overrides: Partial<WorkoutPlanDoc["days"][number]["exercises"][number]> & {
    id: string;
  },
) {
  return {
    exerciseId: "ex-bench",
    customName: null,
    sortOrder: 0,
    targetSets: 3,
    targetReps: "8",
    tempo: null,
    restSeconds: 90,
    targetWeightKg: 60,
    trackingTypeOverride: null,
    ...overrides,
  };
}

function samplePlan(overrides: Partial<WorkoutPlanDoc> = {}): DocWithId<WorkoutPlanDoc> {
  return {
    id: "plan-1",
    gymId: "gym-a",
    memberId: "member-1",
    memberName: "Member One",
    title: "Plan",
    durationWeeks: null,
    focusGoal: null,
    level: null,
    weeklySchedule: null,
    createdAt: ts(),
    updatedAt: ts(),
    days: [
      {
        id: "day-1",
        label: "Day 1",
        sortOrder: 0,
        exercises: [
          planRow({ id: "row-a" }),
          planRow({
            id: "row-b",
            exerciseId: "ex-squat",
            sortOrder: 1,
          }),
        ],
      },
    ],
    ...overrides,
  };
}

function sessionExercise(
  overrides: Partial<WorkoutSessionExerciseEmbedded> & {
    id: string;
    workoutPlanExerciseId: string;
  },
): WorkoutSessionExerciseEmbedded {
  return {
    sortOrder: 0,
    sets: [],
    ...overrides,
  };
}

function activeSession(
  overrides: Partial<WorkoutSessionDoc> & { id?: string } = {},
): DocWithId<WorkoutSessionDoc> {
  return {
    id: overrides.id ?? "session-1",
    gymId: "gym-a",
    memberId: "member-1",
    workoutPlanId: "plan-1",
    workoutPlanDayId: "day-1",
    status: "IN_PROGRESS",
    startedAt: ts("2026-09-22T10:00:00.000Z"),
    completedAt: null,
    durationSeconds: null,
    exercises: [
      sessionExercise({
        id: "sess-ex-a",
        workoutPlanExerciseId: "row-a",
        exerciseId: "ex-bench",
        customName: null,
        targetReps: "8",
      }),
      sessionExercise({
        id: "sess-ex-b",
        workoutPlanExerciseId: "row-b",
        sortOrder: 1,
        exerciseId: "ex-squat",
        customName: null,
        targetReps: "8",
      }),
    ],
    ...overrides,
  };
}

function completedSession(
  overrides: Partial<WorkoutSessionDoc> & { id: string },
): DocWithId<WorkoutSessionDoc> {
  return {
    gymId: "gym-a",
    memberId: "member-1",
    workoutPlanId: "plan-1",
    workoutPlanDayId: "day-1",
    status: "COMPLETED",
    startedAt: ts("2026-09-15T10:00:00.000Z"),
    completedAt: ts("2026-09-15T11:00:00.000Z"),
    durationSeconds: 3600,
    exercises: [
      sessionExercise({
        id: "done-ex-a",
        workoutPlanExerciseId: "row-a",
        exerciseId: "ex-bench",
        customName: null,
        targetReps: "8",
        sets: [
          {
            setNumber: 1,
            weightKg: 80,
            durationSeconds: null,
            loggedAt: ts("2026-09-15T10:30:00.000Z"),
          },
        ],
      }),
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getFirestoreDb).mockReturnValue({
    runTransaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn({})),
  } as never);
});

describe("analyzePlanRowChanges", () => {
  it("detects removed rows and identity swaps", () => {
    const existing = samplePlan();
    const normalized = [
      {
        id: "day-1",
        label: "Day 1",
        sortOrder: 0,
        exercises: [
          {
            id: "row-a",
            exerciseId: "ex-deadlift",
            customName: null,
            sortOrder: 0,
            targetSets: 3,
            targetReps: "5",
            tempo: null,
            restSeconds: 120,
            targetWeightKg: 100,
          },
        ],
      },
    ];

    const impact = analyzePlanRowChanges(normalized, existing);
    expect(impact.retiredRowIds.has("row-b")).toBe(true);
    expect(impact.retiredRowIds.has("row-a")).toBe(true);
  });

  it("allows harmless target edits without blocking ids", () => {
    const existing = samplePlan();
    const normalized = [
      {
        id: "day-1",
        label: "Day 1",
        sortOrder: 0,
        exercises: [
          {
            id: "row-a",
            exerciseId: "ex-bench",
            customName: null,
            sortOrder: 0,
            targetSets: 5,
            targetReps: "12",
            tempo: "3010",
            restSeconds: 45,
            targetWeightKg: 70,
          },
          {
            id: "row-b",
            exerciseId: "ex-squat",
            customName: null,
            sortOrder: 1,
            targetSets: 4,
            targetReps: "6",
            tempo: null,
            restSeconds: 120,
            targetWeightKg: 120,
          },
        ],
      },
    ];

    const impact = analyzePlanRowChanges(normalized, existing);
    expect([...impact.retiredRowIds]).toEqual([]);
    expect([...impact.identityChangedRowIds]).toEqual([]);
  });

  it("detects custom exercise rename as identity change", () => {
    const existing = samplePlan({
      days: [
        {
          id: "day-1",
          label: "Day 1",
          sortOrder: 0,
          exercises: [
            planRow({
              id: "row-custom",
              exerciseId: null,
              customName: "Old Name",
            }),
          ],
        },
      ],
    });

    const impact = analyzePlanRowChanges(
      [
        {
          id: "day-1",
          label: "Day 1",
          sortOrder: 0,
          exercises: [
            {
              id: "row-custom",
              exerciseId: null,
              customName: "New Name",
              sortOrder: 0,
              targetSets: 3,
              targetReps: "10",
              tempo: null,
              restSeconds: 60,
              targetWeightKg: null,
            },
          ],
        },
      ],
      existing,
    );

    expect(impact.identityChangedRowIds.has("row-custom")).toBe(true);
  });
});

describe("validateWorkoutPlanSaveForActiveSession", () => {
  it("blocks removing a row referenced by an active session", async () => {
    mockWorkoutSessions.findActiveSession.mockResolvedValue(activeSession());
    const existing = samplePlan();

    await expect(
      validateWorkoutPlanSaveForActiveSession("gym-a", "member-1", existing, [
        {
          id: "day-1",
          label: "Day 1",
          sortOrder: 0,
          exercises: [
            {
              id: "row-b",
              exerciseId: "ex-squat",
              customName: null,
              sortOrder: 0,
              targetSets: 3,
              targetReps: "8",
              tempo: null,
              restSeconds: 90,
              targetWeightKg: 60,
            },
          ],
        },
      ]),
    ).rejects.toBeInstanceOf(ActiveSessionPlanEditBlockedError);
  });

  it("blocks swapping exercise identity on a row referenced by an active session", async () => {
    mockWorkoutSessions.findActiveSession.mockResolvedValue(activeSession());
    const existing = samplePlan();

    await expect(
      validateWorkoutPlanSaveForActiveSession("gym-a", "member-1", existing, [
        {
          id: "day-1",
          label: "Day 1",
          sortOrder: 0,
          exercises: [
            {
              id: "row-a",
              exerciseId: "ex-deadlift",
              customName: null,
              sortOrder: 0,
              targetSets: 3,
              targetReps: "8",
              tempo: null,
              restSeconds: 90,
              targetWeightKg: 60,
            },
            {
              id: "row-b",
              exerciseId: "ex-squat",
              customName: null,
              sortOrder: 1,
              targetSets: 3,
              targetReps: "8",
              tempo: null,
              restSeconds: 90,
              targetWeightKg: 60,
            },
          ],
        },
      ]),
    ).rejects.toBeInstanceOf(ActiveSessionPlanEditBlockedError);
  });

  it("allows unrelated row edits while a session is active", async () => {
    mockWorkoutSessions.findActiveSession.mockResolvedValue(activeSession());
    const existing = samplePlan();

    await expect(
      validateWorkoutPlanSaveForActiveSession("gym-a", "member-1", existing, [
        {
          id: "day-1",
          label: "Day 1",
          sortOrder: 0,
          exercises: [
            {
              id: "row-a",
              exerciseId: "ex-bench",
              customName: null,
              sortOrder: 0,
              targetSets: 5,
              targetReps: "10",
              tempo: null,
              restSeconds: 60,
              targetWeightKg: 65,
            },
            {
              id: "row-b",
              exerciseId: "ex-squat",
              customName: null,
              sortOrder: 1,
              targetSets: 4,
              targetReps: "6",
              tempo: null,
              restSeconds: 120,
              targetWeightKg: 110,
            },
          ],
        },
      ]),
    ).resolves.toBeUndefined();
  });
});

describe("session exercise identity snapshots", () => {
  it("resolves retired plan rows from session snapshots", () => {
    const plan = samplePlan({
      days: [
        {
          id: "day-1",
          label: "Day 1",
          sortOrder: 0,
          exercises: [planRow({ id: "row-b", exerciseId: "ex-squat" })],
        },
      ],
    });
    const map = buildPlanExerciseMap(plan);
    const exercise = sessionExercise({
      id: "sess-ex-a",
      workoutPlanExerciseId: "row-a",
      exerciseId: "ex-bench",
      customName: null,
      targetReps: "8",
    });

    expect(resolveSessionExerciseContext(exercise, map)?.exerciseId).toBe("ex-bench");
    expect(
      matchesSessionExerciseIdentity(exercise, map, "ex-bench", null),
    ).toBe(true);
  });

  it("supports legacy sessions without snapshot fields", () => {
    const plan = samplePlan();
    const map = buildPlanExerciseMap(plan);
    const legacy = sessionExercise({
      id: "legacy-ex",
      workoutPlanExerciseId: "row-a",
    });

    expect(hasSessionExerciseSnapshot(legacy)).toBe(false);
    expect(getSessionExerciseSnapshot(legacy)).toBeNull();
    expect(resolveSessionExerciseContext(legacy, map)?.exerciseId).toBe("ex-bench");
  });

  it("keeps duplicate exercise rows distinct by workoutPlanExerciseId", () => {
    const plan = samplePlan({
      days: [
        {
          id: "day-1",
          label: "Day 1",
          sortOrder: 0,
          exercises: [
            planRow({ id: "row-a", exerciseId: "ex-bench", sortOrder: 0 }),
            planRow({ id: "row-a-dup", exerciseId: "ex-bench", sortOrder: 1 }),
          ],
        },
      ],
    });
    const map = buildPlanExerciseMap(plan);
    const first = sessionExercise({
      id: "sess-1",
      workoutPlanExerciseId: "row-a",
      exerciseId: "ex-bench",
    });
    const second = sessionExercise({
      id: "sess-2",
      workoutPlanExerciseId: "row-a-dup",
      sortOrder: 1,
      exerciseId: "ex-bench",
    });

    expect(resolveSessionExerciseContext(first, map)?.id).toBe("row-a");
    expect(resolveSessionExerciseContext(second, map)?.id).toBe("row-a-dup");
  });
});

describe("startWorkoutSessionRecord", () => {
  it("snapshots plan-row identity on new sessions", async () => {
    mockWorkoutPlans.findByMemberId.mockResolvedValue(samplePlan());
    mockWorkoutSessions.findActiveSession.mockResolvedValue(null);
    mockWorkoutSessions.createSession.mockResolvedValue(activeSession());

    await startWorkoutSessionRecord(memberCtx, "day-1");

    expect(mockWorkoutSessions.createSession).toHaveBeenCalledWith(
      memberCtx,
      "gym-a",
      expect.any(String),
      expect.objectContaining({
        exercises: expect.arrayContaining([
          expect.objectContaining({
            workoutPlanExerciseId: "row-a",
            exerciseId: "ex-bench",
            customName: null,
            targetReps: "8",
            trackingTypeOverride: null,
          }),
          expect.objectContaining({
            workoutPlanExerciseId: "row-b",
            exerciseId: "ex-squat",
          }),
        ]),
      }),
    );
  });
});

describe("logWorkoutSetRecord", () => {
  beforeEach(() => {
    vi.mocked(getExerciseLibraryMapByIds).mockClear();
  });

  it("logs sets after the referenced plan row is retired using the snapshot", async () => {
    const session = activeSession();
    mockWorkoutSessions.findActiveSession.mockResolvedValue(session);
    mockWorkoutPlans.getById.mockResolvedValue(
      samplePlan({
        days: [
          {
            id: "day-1",
            label: "Day 1",
            sortOrder: 0,
            exercises: [planRow({ id: "row-b", exerciseId: "ex-squat" })],
          },
        ],
      }),
    );

    const result = await logWorkoutSetRecord(memberCtx, {
      sessionExerciseId: "sess-ex-a",
      setNumber: 1,
      weightKg: 82.5,
    });

    expect(result).toEqual({
      sessionExerciseId: "sess-ex-a",
      set: {
        setNumber: 1,
        weightKg: 82.5,
        durationSeconds: null,
      },
    });
    expect(mockWorkoutSessions.upsertSetLogInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      memberCtx,
      "gym-a",
      "session-1",
      "sess-ex-a",
      1,
      expect.objectContaining({ weightKg: 82.5, durationSeconds: null }),
    );
    expect(getExerciseLibraryMapByIds).toHaveBeenCalledWith("gym-a", ["ex-bench"]);
  });

  it("loads only the referenced library exercise instead of the whole plan", async () => {
    mockWorkoutSessions.findActiveSession.mockResolvedValue(activeSession());
    mockWorkoutPlans.getById.mockResolvedValue(
      samplePlan({
        days: [
          {
            id: "day-1",
            label: "Day 1",
            sortOrder: 0,
            exercises: [
              planRow({ id: "row-a", exerciseId: "ex-bench" }),
              planRow({ id: "row-b", exerciseId: "ex-squat", sortOrder: 1 }),
            ],
          },
        ],
      }),
    );

    await logWorkoutSetRecord(memberCtx, {
      sessionExerciseId: "sess-ex-a",
      setNumber: 1,
      weightKg: 80,
    });

    expect(getExerciseLibraryMapByIds).toHaveBeenCalledTimes(1);
    expect(getExerciseLibraryMapByIds).toHaveBeenCalledWith("gym-a", ["ex-bench"]);
  });

  it("upserts duplicate set numbers idempotently", async () => {
    mockWorkoutSessions.findActiveSession.mockResolvedValue(activeSession());
    mockWorkoutPlans.getById.mockResolvedValue(samplePlan());

    const first = await logWorkoutSetRecord(memberCtx, {
      sessionExerciseId: "sess-ex-a",
      setNumber: 1,
      weightKg: 80,
    });
    const second = await logWorkoutSetRecord(memberCtx, {
      sessionExerciseId: "sess-ex-a",
      setNumber: 1,
      weightKg: 82.5,
    });

    expect(first.set.weightKg).toBe(80);
    expect(second.set.weightKg).toBe(82.5);
    expect(mockWorkoutSessions.upsertSetLogInTransaction).toHaveBeenCalledTimes(2);
  });

  it("rejects cross-gym plan lookups via member context", async () => {
    mockWorkoutSessions.findActiveSession.mockResolvedValue(activeSession());
    mockWorkoutPlans.getById.mockResolvedValue(null);

    await expect(
      logWorkoutSetRecord(memberCtx, {
        sessionExerciseId: "sess-ex-a",
        setNumber: 1,
        weightKg: 80,
      }),
    ).rejects.toThrow("Workout session not found.");
  });

  it("fails safely for legacy sessions when the plan row is retired", async () => {
    mockWorkoutSessions.findActiveSession.mockResolvedValue(
      activeSession({
        exercises: [
          sessionExercise({
            id: "legacy-ex",
            workoutPlanExerciseId: "row-a",
          }),
        ],
      }),
    );
    mockWorkoutPlans.getById.mockResolvedValue(
      samplePlan({
        days: [
          {
            id: "day-1",
            label: "Day 1",
            sortOrder: 0,
            exercises: [],
          },
        ],
      }),
    );

    await expect(
      logWorkoutSetRecord(memberCtx, {
        sessionExerciseId: "legacy-ex",
        setNumber: 1,
        weightKg: 80,
      }),
    ).rejects.toThrow("Workout session not found.");
  });
});

describe("getActiveWorkoutSession", () => {
  it("hydrates retired rows from snapshots", async () => {
    mockWorkoutSessions.findActiveSession.mockResolvedValue(activeSession());
    mockWorkoutPlans.getById.mockResolvedValue(
      samplePlan({
        days: [
          {
            id: "day-1",
            label: "Day 1",
            sortOrder: 0,
            exercises: [planRow({ id: "row-b", exerciseId: "ex-squat" })],
          },
        ],
      }),
    );

    const active = await getActiveWorkoutSession("gym-a", "member-1");
    expect(active?.exercises[0]?.displayName).toBe("Bench Press");
    expect(active?.exercises[0]?.exerciseId).toBe("ex-bench");
  });
});

describe("getExerciseProgressData", () => {
  it("includes completed sessions after the plan row is removed", async () => {
    mockWorkoutPlans.findByMemberId.mockResolvedValue(
      samplePlan({
        days: [
          {
            id: "day-1",
            label: "Day 1",
            sortOrder: 0,
            exercises: [planRow({ id: "row-b", exerciseId: "ex-squat" })],
          },
        ],
      }),
    );
    mockWorkoutSessions.listCompletedForMember.mockResolvedValue([
      completedSession({ id: "done-1" }),
    ]);

    const progress = await getExerciseProgressData(
      "gym-a",
      "member-1",
      "ex-bench",
      "weekly",
    );

    expect(progress?.points).toHaveLength(1);
    expect(progress?.points[0]?.maxWeightKg).toBe(80);
  });

  it("does not merge duplicate row ids from different sessions", async () => {
    mockWorkoutPlans.findByMemberId.mockResolvedValue(samplePlan());
    mockWorkoutSessions.listCompletedForMember.mockResolvedValue([
      completedSession({
        id: "done-1",
        exercises: [
          sessionExercise({
            id: "done-ex-a",
            workoutPlanExerciseId: "row-a",
            exerciseId: "ex-bench",
            sets: [
              {
                setNumber: 1,
                weightKg: 80,
                durationSeconds: null,
                loggedAt: ts("2026-09-15T10:30:00.000Z"),
              },
            ],
          }),
        ],
      }),
      completedSession({
        id: "done-2",
        exercises: [
          sessionExercise({
            id: "done-ex-b",
            workoutPlanExerciseId: "row-b",
            exerciseId: "ex-squat",
            sets: [
              {
                setNumber: 1,
                weightKg: 120,
                durationSeconds: null,
                loggedAt: ts("2026-09-16T10:30:00.000Z"),
              },
            ],
          }),
        ],
      }),
    ]);

    const bench = await getExerciseProgressData(
      "gym-a",
      "member-1",
      "ex-bench",
      "weekly",
    );
    const squat = await getExerciseProgressData(
      "gym-a",
      "member-1",
      "ex-squat",
      "weekly",
    );

    expect(bench?.points[0]?.maxWeightKg).toBe(80);
    expect(squat?.points[0]?.maxWeightKg).toBe(120);
  });
});

describe("getPreviousSetsForSessionExercises", () => {
  it("finds previous sets after the plan row is removed", async () => {
    mockWorkoutPlans.findByMemberId.mockResolvedValue(
      samplePlan({
        days: [
          {
            id: "day-1",
            label: "Day 1",
            sortOrder: 0,
            exercises: [planRow({ id: "row-b", exerciseId: "ex-squat" })],
          },
        ],
      }),
    );
    mockWorkoutSessions.listCompletedForMember.mockResolvedValue([
      completedSession({ id: "done-1" }),
    ]);

    const previous = await getPreviousSetsForSessionExercises(
      "gym-a",
      "member-1",
      [
        {
          sessionExerciseId: "sess-ex-a",
          exerciseId: "ex-bench",
          customName: null,
        },
      ],
    );

    expect(previous["sess-ex-a"]).toEqual([
      { setNumber: 1, weightKg: 80, durationSeconds: null },
    ]);
  });
});

describe("getMemberExerciseOptions", () => {
  it("includes retired exercises that still have completed history", async () => {
    mockWorkoutPlans.findByMemberId.mockResolvedValue(
      samplePlan({
        days: [
          {
            id: "day-1",
            label: "Day 1",
            sortOrder: 0,
            exercises: [planRow({ id: "row-b", exerciseId: "ex-squat" })],
          },
        ],
      }),
    );
    mockWorkoutSessions.listCompletedForMember.mockResolvedValue([
      completedSession({ id: "done-1" }),
    ]);

    const options = await getMemberExerciseOptions("gym-a", "member-1");
    expect(options.map((option) => option.key)).toEqual(["ex-squat", "ex-bench"]);
  });
});

describe("repository ownership checks", () => {
  it("denies cross-gym active session lookup", async () => {
    const repo = new WorkoutSessionsRepository({} as never);

    await expect(
      repo.findActiveSession(
        { kind: "member", gymId: "gym-a", memberId: "member-1" },
        "gym-b",
        "member-1",
      ),
    ).rejects.toThrow(/Tenant isolation violation/);
  });
});

describe("completeWorkoutSessionRecord", () => {
  it("still completes active sessions after unrelated plan edits", async () => {
    mockWorkoutSessions.getActiveSessionForMember.mockResolvedValue(activeSession());

    await completeWorkoutSessionRecord(memberCtx, "session-1");

    expect(mockWorkoutSessions.completeSessionInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      memberCtx,
      "gym-a",
      "session-1",
      expect.any(Number),
    );
  });
});
