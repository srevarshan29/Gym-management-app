import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  personalWorkoutContainsCatalog,
  pickDefaultPersonalWorkoutId,
  selectedPersonalWorkout,
} from "@/lib/member-portal/member-exercise-destination";
import type { MemberPersonalWorkoutSummary } from "@/lib/workout-tracking/member-personal-workouts";

function summary(
  partial: Partial<MemberPersonalWorkoutSummary> &
    Pick<MemberPersonalWorkoutSummary, "id" | "name">,
): MemberPersonalWorkoutSummary {
  return {
    exerciseCount: partial.catalogIds?.length ?? partial.exerciseCount ?? 0,
    catalogIds: partial.catalogIds ?? [],
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("member exercise destination helpers", () => {
  const workouts = [
    summary({
      id: "w1",
      name: "Push",
      catalogIds: ["cat-bench"],
      exerciseCount: 1,
    }),
    summary({ id: "w2", name: "Pull", catalogIds: [], exerciseCount: 0 }),
  ];

  it("detects when a catalog exercise is already in a workout", () => {
    expect(personalWorkoutContainsCatalog(workouts[0], "cat-bench")).toBe(true);
    expect(personalWorkoutContainsCatalog(workouts[0], "cat-row")).toBe(false);
    expect(personalWorkoutContainsCatalog(workouts[1], "cat-bench")).toBe(
      false,
    );
  });

  it("picks preferred workout when it exists, otherwise first row", () => {
    expect(pickDefaultPersonalWorkoutId(workouts, "w2")).toBe("w2");
    expect(pickDefaultPersonalWorkoutId(workouts, "missing")).toBe("w1");
    expect(pickDefaultPersonalWorkoutId([], "w1")).toBe("");
  });

  it("resolves selected workout by id", () => {
    expect(selectedPersonalWorkout(workouts, "w2")?.name).toBe("Pull");
    expect(selectedPersonalWorkout(workouts, "")).toBeNull();
  });
});

describe("member exercise destination picker UI", () => {
  it("renders selectable workouts with primary border and add CTA copy", () => {
    const source = readFileSync(
      resolve(
        "src/components/member-portal/workout/member-exercise-destination-picker.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("border-primary");
    expect(source).toContain("Already added");
    expect(source).toMatch(/Add to \$\{selected/);
    expect(source).toContain("Create new workout");
    expect(source).toContain("Create workout");
    expect(source).toContain("Change");
  });

  it("keeps member on detail page after add (no editor redirect)", () => {
    const source = readFileSync(
      resolve("src/components/member-portal/workout/member-exercise-detail.tsx"),
      "utf8",
    );
    expect(source).not.toContain("router.push");
    expect(source).not.toContain("Back to library");
    expect(source).toContain("MemberExerciseDestinationPicker");
    expect(source).toContain("addExerciseToPersonalWorkoutAction");
  });
});
