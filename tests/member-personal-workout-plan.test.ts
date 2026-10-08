import { describe, expect, it } from "vitest";

import {
  appendPersonalWorkoutExercise,
  removePersonalWorkoutExercise,
  reorderPersonalWorkoutExercises,
} from "@/lib/workout-tracking/member-personal-workout-plan";

describe("member personal workout plan helpers", () => {
  const base = [
    {
      id: "a",
      catalogId: "cat-1",
      sortOrder: 0,
      targetSets: 3,
      targetReps: "10",
    },
    {
      id: "b",
      catalogId: "cat-2",
      sortOrder: 1,
      targetSets: 4,
      targetReps: "8",
    },
  ];

  it("reorders exercises by id list", () => {
    const reordered = reorderPersonalWorkoutExercises(base, ["b", "a"]);
    expect(reordered.map((r) => r.id)).toEqual(["b", "a"]);
    expect(reordered[0]?.sortOrder).toBe(0);
    expect(reordered[1]?.sortOrder).toBe(1);
  });

  it("removes an exercise and reindexes sortOrder", () => {
    const next = removePersonalWorkoutExercise(base, "a");
    expect(next).toHaveLength(1);
    expect(next[0]?.id).toBe("b");
    expect(next[0]?.sortOrder).toBe(0);
  });

  it("appends a catalog exercise", () => {
    const next = appendPersonalWorkoutExercise(base, "cat-3", {
      targetSets: 5,
      targetReps: "5",
    });
    expect(next).toHaveLength(3);
    expect(next[2]?.catalogId).toBe("cat-3");
    expect(next[2]?.targetSets).toBe(5);
  });
});
