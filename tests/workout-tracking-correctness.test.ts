import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";

import { buildActiveWorkoutSessionView } from "@/lib/workout-tracking/sessions";
import { emptyWorkoutPlanShellForSession } from "@/lib/workout-tracking/session-plan";
import { PREVIOUS_SETS_COMPLETED_SESSION_LIMIT } from "@/lib/workout-tracking/previous-sets";

function ts(iso = "2026-09-20T00:00:00.000Z") {
  return Timestamp.fromDate(new Date(iso));
}

describe("workout tracking correctness helpers", () => {
  it("hydrates an in-progress session when the plan document is unavailable", () => {
    const session = {
      id: "session-1",
      gymId: "gym-a",
      memberId: "member-1",
      workoutPlanId: "plan-retired",
      workoutPlanDayId: "day-1",
      status: "IN_PROGRESS" as const,
      startedAt: ts(),
      completedAt: null,
      durationSeconds: null,
      exercises: [
        {
          id: "sess-ex-1",
          workoutPlanExerciseId: "row-removed",
          sortOrder: 0,
          exerciseId: "ex-bench",
          customName: null,
          trackingTypeOverride: null,
          targetReps: "8",
          sets: [
            {
              setNumber: 1,
              weightKg: 60,
              durationSeconds: null,
              loggedAt: ts(),
            },
          ],
        },
      ],
    };

    const planShell = emptyWorkoutPlanShellForSession(session);
    const view = buildActiveWorkoutSessionView("gym-a", planShell, session, [
      {
        id: "ex-bench",
        name: "Bench Press",
        muscleGroup: "CHEST",
        defaultSets: 3,
        defaultReps: "8",
        defaultTempo: null,
        defaultRestSeconds: 90,
        trackingType: "WEIGHTED",
        isSeeded: true,
        exerciseSource: "SEEDED",
        catalogId: null,
        importedCatalogVersion: null,
        media: {
          primaryImageUrl: null,
          secondaryImageUrl: null,
          thumbnailUrl: null,
        },
        hasMedia: false,
      },
    ]);

    expect(view.id).toBe("session-1");
    expect(view.exercises[0]?.displayName).toBe("Bench Press");
    expect(view.exercises[0]?.exerciseId).toBe("ex-bench");
    expect(view.exercises[0]?.sets).toEqual([
      { setNumber: 1, weightKg: 60, durationSeconds: null },
    ]);
  });

  it("keeps previous-set scan limit aligned with pre-performance default", () => {
    expect(PREVIOUS_SETS_COMPLETED_SESSION_LIMIT).toBe(200);
  });
});
