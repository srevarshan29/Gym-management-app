import { describe, expect, it, vi } from "vitest";

import type { StaffContext } from "@/lib/firestore/context";
import { WorkoutPlansRepository } from "@/lib/firestore/repositories/workout-plans";
import {
  EXERCISE_REFERENCE_SCAN_BATCH_SIZE,
  planDaysReferenceLibraryExercise,
} from "@/lib/firestore/workout-plan-exercise-reference";

function embeddedRow(exerciseId: string | null, id = "row-1") {
  return {
    id,
    exerciseId,
    customName: null,
    sortOrder: 0,
    targetSets: 3,
    targetReps: "10",
    tempo: null,
    restSeconds: 60,
    targetWeightKg: null,
    trackingTypeOverride: null,
  };
}

function embeddedDay(
  exercises: ReturnType<typeof embeddedRow>[],
  id = "day-1",
) {
  return {
    id,
    label: "Day 1",
    sortOrder: 0,
    exercises,
  };
}

describe("planDaysReferenceLibraryExercise", () => {
  it("returns true when a referenced exercise appears in any day", () => {
    const days = [
      embeddedDay([embeddedRow("ex-1", "row-a")]),
      embeddedDay([embeddedRow(null, "row-custom"), embeddedRow("ex-2", "row-b")], "day-2"),
    ];

    expect(planDaysReferenceLibraryExercise(days, "ex-2")).toBe(true);
  });

  it("returns false when the exercise is not referenced", () => {
    const days = [embeddedDay([embeddedRow("ex-1"), embeddedRow("ex-2")])];

    expect(planDaysReferenceLibraryExercise(days, "ex-9")).toBe(false);
    expect(planDaysReferenceLibraryExercise([], "ex-1")).toBe(false);
    expect(planDaysReferenceLibraryExercise(null, "ex-1")).toBe(false);
  });

  it("ignores custom-only rows without library exercise ids", () => {
    const days = [embeddedDay([embeddedRow(null, "row-custom")])];

    expect(planDaysReferenceLibraryExercise(days, "ex-1")).toBe(false);
  });

  it("tolerates malformed or deleted plan fragments", () => {
    expect(planDaysReferenceLibraryExercise(undefined, "ex-1")).toBe(false);
    expect(
      planDaysReferenceLibraryExercise(
        [{ id: "day-1", label: "Broken", sortOrder: 0, exercises: null }],
        "ex-1",
      ),
    ).toBe(false);
    expect(
      planDaysReferenceLibraryExercise(
        [embeddedDay([{ exerciseId: "ex-1" } as never])],
        "ex-1",
      ),
    ).toBe(true);
  });

  it("does not match blank exercise ids", () => {
    const days = [embeddedDay([embeddedRow("ex-1")])];

    expect(planDaysReferenceLibraryExercise(days, "   ")).toBe(false);
  });
});

describe("WorkoutPlansRepository.isExerciseReferenced", () => {
  const staffCtx: StaffContext = {
    kind: "staff",
    userId: "staff-1",
    gymId: "gym-a",
    role: "OWNER",
  };

  function planSnapshot(
    id: string,
    gymId: string,
    memberName: string,
    days: unknown,
  ) {
    return {
      id,
      data: () => ({
        gymId,
        memberName,
        days,
      }),
    };
  }

  function buildRepo(getMock: ReturnType<typeof vi.fn>, docsByBatch: unknown[][]) {
    let batchIndex = 0;
    const queryResult = {
      startAfter: vi.fn(),
      get: vi.fn(async () => {
        const docs = docsByBatch[batchIndex] ?? [];
        batchIndex += 1;
        return { docs, empty: docs.length === 0 };
      }),
    };
    queryResult.startAfter.mockReturnValue(queryResult);

    const limit = vi.fn().mockReturnValue(queryResult);
    const select = vi.fn().mockReturnValue({ limit });
    const orderBy = vi.fn().mockReturnValue({ select });
    const where = vi.fn().mockReturnValue({ orderBy });
    const doc = vi.fn(() => ({ get: getMock }));
    const collection = vi.fn(() => ({ where, doc }));

    const repo = new WorkoutPlansRepository({ collection } as never);
    return { repo, queryResult, getMock, where };
  }

  it("returns true for a referenced exercise and stops after the first matching batch", async () => {
    const { repo, queryResult } = buildRepo(
      vi.fn().mockResolvedValue({ exists: true }),
      [
        [
          planSnapshot("plan-1", "gym-a", "Alice", [
            embeddedDay([embeddedRow("ex-target")]),
          ]),
        ],
      ],
    );

    const referenced = await repo.isExerciseReferenced(staffCtx, "gym-a", "ex-target");

    expect(referenced).toBe(true);
    expect(queryResult.get).toHaveBeenCalledTimes(1);
  });

  it("scans multiple plans across batches when no early match exists", async () => {
    const batchSize = EXERCISE_REFERENCE_SCAN_BATCH_SIZE;
    const firstBatch = Array.from({ length: batchSize }, (_, index) =>
      planSnapshot(`plan-${index}`, "gym-a", `Member ${index}`, [
        embeddedDay([embeddedRow("ex-other")]),
      ]),
    );
    const secondBatch = [
      planSnapshot("plan-match", "gym-a", "Zed", [
        embeddedDay([embeddedRow("ex-target")]),
      ]),
    ];

    const { repo, queryResult } = buildRepo(
      vi.fn().mockResolvedValue({ exists: true }),
      [firstBatch, secondBatch],
    );

    const referenced = await repo.isExerciseReferenced(staffCtx, "gym-a", "ex-target");

    expect(referenced).toBe(true);
    expect(queryResult.get).toHaveBeenCalledTimes(2);
  });

  it("returns false when no gym plan references the exercise", async () => {
    const { repo } = buildRepo(vi.fn().mockResolvedValue({ exists: false }), [
      [planSnapshot("plan-1", "gym-a", "Alice", [embeddedDay([embeddedRow("ex-other")])])],
    ]);

    await expect(
      repo.isExerciseReferenced(staffCtx, "gym-a", "ex-target"),
    ).resolves.toBe(false);
  });

  it("ignores documents whose stored gymId does not match the requested gym", async () => {
    const { repo } = buildRepo(vi.fn().mockResolvedValue({ exists: false }), [
      [planSnapshot("plan-b", "gym-b", "Bob", [embeddedDay([embeddedRow("ex-target")])])],
    ]);

    await expect(
      repo.isExerciseReferenced(staffCtx, "gym-a", "ex-target"),
    ).resolves.toBe(false);
  });

  it("scopes every query to the requested gymId", async () => {
    const { repo, where } = buildRepo(vi.fn().mockResolvedValue({ exists: false }), [[]]);

    await repo.isExerciseReferenced(staffCtx, "gym-a", "ex-target");

    expect(where).toHaveBeenCalledWith("gymId", "==", "gym-a");
  });

  it("ignores malformed plan documents in the same gym", async () => {
    const { repo } = buildRepo(vi.fn().mockResolvedValue({ exists: false }), [
      [planSnapshot("plan-broken", "gym-a", "Broken", null)],
    ]);

    await expect(
      repo.isExerciseReferenced(staffCtx, "gym-a", "ex-target"),
    ).resolves.toBe(false);
  });
});
