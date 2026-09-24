import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DocWithId } from "@/lib/firestore/repositories/base";
import {
  ActiveSessionPlanEditBlockedError,
  buildEmbeddedPlanDays,
  validateWorkoutPlanLibraryExerciseIds,
  validateWorkoutPlanSaveForActiveSession,
  WorkoutPlanExerciseValidationError,
  type NormalizedPlanDayInput,
} from "@/lib/firestore/workout-plan-operations";
import type { CustomExerciseDoc, WorkoutPlanDoc } from "@/lib/firestore/types";

const mockCustomExercises = {
  getByIds: vi.fn(),
};

const mockWorkoutSessions = {
  findActiveSession: vi.fn(),
};

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    customExercises: mockCustomExercises,
    workoutSessions: mockWorkoutSessions,
  }),
  platformContext: { kind: "platform" },
}));

function exerciseDoc(
  id: string,
  gymId = "gym-a",
): DocWithId<CustomExerciseDoc> {
  const now = Timestamp.fromDate(new Date("2026-09-20T00:00:00.000Z"));
  return {
    id,
    gymId,
    name: "Bench Press",
    nameLower: "bench press",
    muscleGroup: "CHEST",
    defaultSets: 3,
    defaultReps: "8",
    defaultTempo: null,
    defaultRestSeconds: 90,
    trackingType: "WEIGHTED",
    isSeeded: true,
    createdAt: now,
    updatedAt: now,
  };
}

function planDay(
  exercises: NormalizedPlanDayInput["exercises"],
  id = "day-1",
): NormalizedPlanDayInput {
  return {
    id,
    label: "Day 1",
    sortOrder: 0,
    exercises,
  };
}

function libraryRow(
  exerciseId: string,
  rowId = "row-1",
): NormalizedPlanDayInput["exercises"][number] {
  return {
    id: rowId,
    exerciseId,
    customName: null,
    sortOrder: 0,
    targetSets: 3,
    targetReps: "8",
    tempo: null,
    restSeconds: 90,
    targetWeightKg: 60,
  };
}

function customRow(
  customName: string,
  rowId = "row-custom",
): NormalizedPlanDayInput["exercises"][number] {
  return {
    id: rowId,
    exerciseId: null,
    customName,
    sortOrder: 0,
    targetSets: 3,
    targetReps: "10",
    tempo: null,
    restSeconds: 60,
    targetWeightKg: null,
  };
}

describe("validateWorkoutPlanLibraryExerciseIds", () => {
  beforeEach(() => {
    mockCustomExercises.getByIds.mockReset();
    mockWorkoutSessions.findActiveSession.mockReset();
  });

  it("accepts valid exercise IDs", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([exerciseDoc("ex-bench")]);

    await expect(
      validateWorkoutPlanLibraryExerciseIds("gym-a", [
        planDay([libraryRow("ex-bench")]),
      ]),
    ).resolves.toBeUndefined();

    expect(mockCustomExercises.getByIds).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
      ["ex-bench"],
    );
  });

  it("rejects a nonexistent exercise ID", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([]);

    await expect(
      validateWorkoutPlanLibraryExerciseIds("gym-a", [
        planDay([libraryRow("ex-missing")]),
      ]),
    ).rejects.toBeInstanceOf(WorkoutPlanExerciseValidationError);
  });

  it("rejects a cross-gym exercise ID", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([]);

    await expect(
      validateWorkoutPlanLibraryExerciseIds("gym-a", [
        planDay([libraryRow("ex-other-gym")]),
      ]),
    ).rejects.toBeInstanceOf(WorkoutPlanExerciseValidationError);
  });

  it("rejects a deleted exercise ID", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([]);

    await expect(
      validateWorkoutPlanLibraryExerciseIds("gym-a", [
        planDay([libraryRow("ex-deleted")]),
      ]),
    ).rejects.toBeInstanceOf(WorkoutPlanExerciseValidationError);
  });

  it("accepts multiple valid exercise IDs in one batched read", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([
      exerciseDoc("ex-bench"),
      exerciseDoc("ex-squat"),
    ]);

    await expect(
      validateWorkoutPlanLibraryExerciseIds("gym-a", [
        planDay([
          libraryRow("ex-bench", "row-a"),
          libraryRow("ex-squat", "row-b"),
        ]),
      ]),
    ).resolves.toBeUndefined();

    expect(mockCustomExercises.getByIds).toHaveBeenCalledTimes(1);
    expect(mockCustomExercises.getByIds).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
      expect.arrayContaining(["ex-bench", "ex-squat"]),
    );
  });

  it("rejects mixed valid and invalid exercise IDs", async () => {
    mockCustomExercises.getByIds.mockResolvedValue([exerciseDoc("ex-bench")]);

    await expect(
      validateWorkoutPlanLibraryExerciseIds("gym-a", [
        planDay([
          libraryRow("ex-bench", "row-a"),
          libraryRow("ex-missing", "row-b"),
        ]),
      ]),
    ).rejects.toBeInstanceOf(WorkoutPlanExerciseValidationError);
  });

  it("supports custom-name and tracking-only rows without library IDs", async () => {
    await expect(
      validateWorkoutPlanLibraryExerciseIds("gym-a", [
        planDay([customRow("Band pull-apart")]),
      ]),
    ).resolves.toBeUndefined();

    expect(mockCustomExercises.getByIds).not.toHaveBeenCalled();
  });

  it("does not change active-session protection behavior", async () => {
    const existingPlan: Pick<WorkoutPlanDoc, "days"> = {
      days: [
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
              targetSets: 3,
              targetReps: "8",
              tempo: null,
              restSeconds: 90,
              targetWeightKg: 60,
              trackingTypeOverride: null,
            },
          ],
        },
      ],
    };

    mockWorkoutSessions.findActiveSession.mockResolvedValue({
      id: "session-1",
      exercises: [{ workoutPlanExerciseId: "row-a" }],
    });

    await expect(
      validateWorkoutPlanSaveForActiveSession(
        "gym-a",
        "member-1",
        existingPlan,
        [planDay([libraryRow("ex-bench", "row-a")])],
      ),
    ).resolves.toBeUndefined();

    await expect(
      validateWorkoutPlanSaveForActiveSession(
        "gym-a",
        "member-1",
        existingPlan,
        [planDay([customRow("Finisher", "row-a")])],
      ),
    ).rejects.toBeInstanceOf(ActiveSessionPlanEditBlockedError);
  });

  it("preserves existing row IDs when validation passes", () => {
    const existingPlan: Pick<WorkoutPlanDoc, "days"> = {
      days: [
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
              targetSets: 3,
              targetReps: "8",
              tempo: null,
              restSeconds: 90,
              targetWeightKg: 60,
              trackingTypeOverride: null,
            },
          ],
        },
      ],
    };

    const embedded = buildEmbeddedPlanDays(
      [planDay([libraryRow("ex-bench", "row-a")])],
      existingPlan,
    );

    expect(embedded[0]?.id).toBe("day-1");
    expect(embedded[0]?.exercises[0]?.id).toBe("row-a");
  });
});
