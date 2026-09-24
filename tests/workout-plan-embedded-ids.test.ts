import { describe, expect, it } from "vitest";

import {
  buildEmbeddedPlanDays,
  type NormalizedPlanDayInput,
} from "@/lib/firestore/workout-plan-operations";
import type { WorkoutPlanDoc } from "@/lib/firestore/types";
import {
  buildPlanExerciseMap,
  planExerciseDisplayName,
} from "@/lib/workout-tracking/session-plan";

function sampleExistingPlan(): Pick<WorkoutPlanDoc, "days"> {
  return {
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
          {
            id: "row-b",
            exerciseId: "ex-bench",
            customName: null,
            sortOrder: 1,
            targetSets: 2,
            targetReps: "12",
            tempo: null,
            restSeconds: 60,
            targetWeightKg: 40,
            trackingTypeOverride: "BODYWEIGHT",
          },
        ],
      },
      {
        id: "day-2",
        label: "Day 2",
        sortOrder: 1,
        exercises: [
          {
            id: "row-c",
            exerciseId: "ex-squat",
            customName: null,
            sortOrder: 0,
            targetSets: 4,
            targetReps: "5",
            tempo: null,
            restSeconds: 120,
            targetWeightKg: 100,
            trackingTypeOverride: null,
          },
        ],
      },
    ],
  };
}

function normalizedFromExisting(
  existing: Pick<WorkoutPlanDoc, "days">,
): NormalizedPlanDayInput[] {
  return existing.days.map((day) => ({
    id: day.id,
    label: day.label,
    sortOrder: day.sortOrder,
    exercises: day.exercises.map((row) => ({
      id: row.id,
      exerciseId: row.exerciseId,
      customName: row.customName,
      sortOrder: row.sortOrder,
      targetSets: row.targetSets,
      targetReps: row.targetReps,
      tempo: row.tempo,
      restSeconds: row.restSeconds,
      targetWeightKg: row.targetWeightKg,
    })),
  }));
}

describe("buildEmbeddedPlanDays", () => {
  it("generates fresh IDs for new plans even when client sends temporary keys", () => {
    const created = buildEmbeddedPlanDays(
      [
        {
          id: "day-temp-1",
          label: "Day 1",
          sortOrder: 0,
          exercises: [
            {
              id: "lib-ex-1-123",
              exerciseId: "ex-1",
              customName: null,
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
      null,
    );

    expect(created[0]!.id).not.toBe("day-temp-1");
    expect(created[0]!.exercises[0]!.id).not.toBe("lib-ex-1-123");
  });

  it("preserves day and exercise row IDs when editing without changes", () => {
    const existing = sampleExistingPlan();
    const preserved = buildEmbeddedPlanDays(normalizedFromExisting(existing), existing);

    expect(preserved.map((day) => day.id)).toEqual(["day-1", "day-2"]);
    expect(preserved[0]!.exercises.map((row) => row.id)).toEqual(["row-a", "row-b"]);
    expect(preserved[1]!.exercises.map((row) => row.id)).toEqual(["row-c"]);
  });

  it("preserves row IDs when editable fields change", () => {
    const existing = sampleExistingPlan();
    const input = normalizedFromExisting(existing);
    input[0]!.exercises[0]!.targetSets = 5;
    input[0]!.exercises[0]!.targetReps = "6-8";
    input[0]!.exercises[0]!.targetWeightKg = 70;

    const preserved = buildEmbeddedPlanDays(input, existing);

    expect(preserved[0]!.exercises.map((row) => row.id)).toEqual(["row-a", "row-b"]);
    expect(preserved[0]!.exercises[0]).toMatchObject({
      id: "row-a",
      targetSets: 5,
      targetReps: "6-8",
      targetWeightKg: 70,
    });
  });

  it("creates only one new row ID when adding an exercise", () => {
    const existing = sampleExistingPlan();
    const input = normalizedFromExisting(existing);
    input[0]!.exercises.push({
      id: "lib-ex-new-999",
      exerciseId: "ex-row",
      customName: null,
      sortOrder: 2,
      targetSets: 3,
      targetReps: "10",
      tempo: null,
      restSeconds: 45,
      targetWeightKg: null,
    });

    const preserved = buildEmbeddedPlanDays(input, existing);
    const rowIds = preserved[0]!.exercises.map((row) => row.id);

    expect(rowIds.slice(0, 2)).toEqual(["row-a", "row-b"]);
    expect(rowIds[2]).toBeTruthy();
    expect(rowIds[2]).not.toBe("lib-ex-new-999");
    expect(new Set(rowIds).size).toBe(rowIds.length);
  });

  it("removes deleted exercises without changing surviving row IDs", () => {
    const existing = sampleExistingPlan();
    const input = normalizedFromExisting(existing);
    input[0]!.exercises = input[0]!.exercises.filter((row) => row.id !== "row-b");

    const preserved = buildEmbeddedPlanDays(input, existing);

    expect(preserved[0]!.exercises.map((row) => row.id)).toEqual(["row-a"]);
    expect(
      preserved.flatMap((day) => day.exercises).some((row) => row.id === "row-b"),
    ).toBe(false);
  });

  it("does not reuse IDs from deleted rows even if a client re-submits them", () => {
    const existing = sampleExistingPlan();
    const input = normalizedFromExisting(existing);
    input[0]!.exercises = input[0]!.exercises.filter((row) => row.id !== "row-b");
    input[0]!.exercises.push({
      id: "row-b",
      exerciseId: "ex-new",
      customName: null,
      sortOrder: 2,
      targetSets: 3,
      targetReps: "10",
      tempo: null,
      restSeconds: 45,
      targetWeightKg: null,
    });

    const preserved = buildEmbeddedPlanDays(input, existing);
    const rowIds = preserved[0]!.exercises.map((row) => row.id);

    expect(rowIds[0]).toBe("row-a");
    expect(rowIds[1]).not.toBe("row-b");
  });

  it("creates a new day ID while preserving existing day IDs", () => {
    const existing = sampleExistingPlan();
    const input = normalizedFromExisting(existing);
    input.push({
      id: "day-temp-new",
      label: "Day 3",
      sortOrder: 2,
      exercises: [
        {
          id: "lib-row-new",
          exerciseId: "ex-pull",
          customName: null,
          sortOrder: 0,
          targetSets: 3,
          targetReps: "8",
          tempo: null,
          restSeconds: 90,
          targetWeightKg: null,
        },
      ],
    });

    const preserved = buildEmbeddedPlanDays(input, existing);

    expect(preserved[0]!.id).toBe("day-1");
    expect(preserved[1]!.id).toBe("day-2");
    expect(preserved[2]!.id).not.toBe("day-temp-new");
    expect(preserved[2]!.exercises[0]!.id).not.toBe("lib-row-new");
  });

  it("preserves row IDs when rows are reordered", () => {
    const existing = sampleExistingPlan();
    const input = normalizedFromExisting(existing);
    input[0]!.exercises = [
      { ...input[0]!.exercises[1]!, sortOrder: 0 },
      { ...input[0]!.exercises[0]!, sortOrder: 1 },
    ];

    const preserved = buildEmbeddedPlanDays(input, existing);

    expect(preserved[0]!.exercises.map((row) => row.id)).toEqual(["row-b", "row-a"]);
    expect(preserved[0]!.exercises.map((row) => row.sortOrder)).toEqual([0, 1]);
  });

  it("keeps distinct IDs for duplicate exerciseId rows", () => {
    const existing = sampleExistingPlan();
    const preserved = buildEmbeddedPlanDays(normalizedFromExisting(existing), existing);

    const duplicateRows = preserved[0]!.exercises.filter(
      (row) => row.exerciseId === "ex-bench",
    );
    expect(duplicateRows.map((row) => row.id)).toEqual(["row-a", "row-b"]);
  });

  it("keeps session and progress references valid after a plan edit", () => {
    const existing = sampleExistingPlan();
    const sessionExerciseId = "row-a";
    const input = normalizedFromExisting(existing);
    input[0]!.exercises[0]!.targetSets = 4;

    const preserved = buildEmbeddedPlanDays(input, existing);
    const planMap = buildPlanExerciseMap({ days: preserved } as WorkoutPlanDoc);
    const planExercise = planMap.get(sessionExerciseId);

    expect(planExercise).toBeDefined();
    expect(planExercise?.targetSets).toBe(4);
    expect(
      planExerciseDisplayName(planExercise!, new Map([
        ["ex-bench", { name: "Bench Press", muscleGroup: "CHEST", trackingType: "WEIGHTED", isSeeded: false }],
      ])),
    ).toBe("Bench Press");
    expect(planExercise?.trackingTypeOverride).toBeNull();
    expect(planMap.get("row-b")?.trackingTypeOverride).toBe("BODYWEIGHT");
  });
});
