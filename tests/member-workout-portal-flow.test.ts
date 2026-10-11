import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MemberContext } from "@/lib/firestore/context";
import {
  memberLibraryFilterToCatalogMuscleGroup,
  parseMemberLibraryMuscleGroup,
} from "@/lib/member-portal/member-library-muscle-groups";
import {
  memberExerciseLibraryDetailHref,
  memberPersonalWorkoutAddExercisesHref,
  memberPersonalWorkoutEditorHref,
  memberWorkoutPageHref,
  parseMemberPlanFilter,
  parseMemberWorkoutTab,
} from "@/lib/member-portal/member-workout-tab-url";
import {
  addCatalogExerciseToPersonalWorkout,
  addCatalogExercisesToPersonalWorkout,
  createMemberPersonalWorkout,
  DEFAULT_PERSONAL_WORKOUT_NAME,
  getMemberPersonalWorkoutDetail,
  listMemberPersonalWorkouts,
} from "@/lib/workout-tracking/member-personal-workouts";

const memberCtx: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-a",
};

vi.mock("@/lib/firestore", () => ({
  getRepositories: vi.fn(),
}));

import { getRepositories } from "@/lib/firestore";

describe("member workout tab URLs", () => {
  it("parses top-level tab query values with legacy aliases", () => {
    expect(parseMemberWorkoutTab("plan")).toBe("plan");
    expect(parseMemberWorkoutTab("exercises")).toBe("exercises");
    expect(parseMemberWorkoutTab("library")).toBe("exercises");
    expect(parseMemberWorkoutTab("mine")).toBe("plan");
    expect(parseMemberWorkoutTab("assigned")).toBe("plan");
    expect(parseMemberWorkoutTab("invalid")).toBe("plan");
  });

  it("parses plan filter from legacy tab and planFilter query", () => {
    expect(parseMemberPlanFilter(null, null)).toBe("trainer");
    expect(parseMemberPlanFilter("plan", null)).toBe("trainer");
    expect(parseMemberPlanFilter("assigned", null)).toBe("trainer");
    expect(parseMemberPlanFilter("mine", null)).toBe("mine");
    expect(parseMemberPlanFilter("plan", "trainer")).toBe("trainer");
    expect(parseMemberPlanFilter("plan", "all")).toBe("all");
    expect(parseMemberPlanFilter(null, "all")).toBe("all");
    expect(parseMemberPlanFilter("library", null)).toBe("trainer");
  });

  it("defaults bare workout landing to Plan → Trainer in href builder", () => {
    expect(memberWorkoutPageHref({})).toBe("/member/workout?tab=assigned");
    expect(memberWorkoutPageHref({ tab: "plan", planFilter: "all" })).toBe(
      "/member/workout?tab=plan&planFilter=all",
    );
  });

  it("builds workout page href with tab and addTo", () => {
    expect(memberWorkoutPageHref({ tab: "mine" })).toBe(
      "/member/workout?tab=mine",
    );
    expect(
      memberWorkoutPageHref({ tab: "library", addTo: "workout-1" }),
    ).toBe("/member/workout?tab=library&addTo=workout-1");
    expect(
      memberWorkoutPageHref({ tab: "mine", created: "workout-2" }),
    ).toBe("/member/workout?tab=mine&created=workout-2");
  });

  it("builds library detail href with optional addTo and group", () => {
    expect(memberExerciseLibraryDetailHref("bench-press")).toBe(
      "/member/workout/library/bench-press",
    );
    expect(
      memberExerciseLibraryDetailHref("bench-press", {
        addToWorkoutId: "w1",
        group: "CHEST",
      }),
    ).toBe(
      "/member/workout/library/bench-press?addTo=w1&group=CHEST",
    );
  });

  it("builds library tab href with muscle group filter", () => {
    expect(
      memberWorkoutPageHref({ tab: "library", group: "LEGS" }),
    ).toBe("/member/workout?tab=library&group=LEGS");
  });

  it("builds personal workout editor and add-exercises hrefs", () => {
    expect(memberPersonalWorkoutEditorHref("w1")).toBe(
      "/member/workout/personal/w1",
    );
    expect(memberPersonalWorkoutAddExercisesHref("w1")).toBe(
      "/member/workout?tab=library&addTo=w1",
    );
    expect(memberPersonalWorkoutAddExercisesHref("w1", "CHEST")).toBe(
      "/member/workout?tab=library&addTo=w1&group=CHEST",
    );
  });
});

describe("member library muscle group filters", () => {
  it("parses group query values", () => {
    expect(parseMemberLibraryMuscleGroup("chest")).toBe("CHEST");
    expect(parseMemberLibraryMuscleGroup("FULL_BODY")).toBe("FULL_BODY");
    expect(parseMemberLibraryMuscleGroup("invalid")).toBeNull();
  });

  it("maps library filters to catalog muscle groups", () => {
    expect(memberLibraryFilterToCatalogMuscleGroup("CHEST")).toBe("CHEST");
    expect(memberLibraryFilterToCatalogMuscleGroup("FULL_BODY")).toBeNull();
    expect(memberLibraryFilterToCatalogMuscleGroup(null)).toBeNull();
  });
});

describe("addCatalogExerciseToPersonalWorkout", () => {
  const getForMember = vi.fn();
  const getByCatalogIds = vi.fn();
  const updateForMember = vi.fn();

  beforeEach(() => {
    getForMember.mockReset();
    getByCatalogIds.mockReset();
    updateForMember.mockReset();
    vi.mocked(getRepositories).mockReturnValue({
      memberPersonalWorkouts: {
        getForMember,
        updateForMember,
      },
      exerciseCatalog: {
        getByCatalogIds,
      },
    } as never);
  });

  it("appends exercise with default sets/reps for the member workout", async () => {
    getForMember.mockResolvedValue({
      id: "w1",
      gymId: "gym-a",
      memberId: "member-a",
      name: "Push day",
      exercises: [],
    });
    getByCatalogIds.mockResolvedValue(
      new Map([
        [
          "cat-bench",
          {
            catalogId: "cat-bench",
            name: "Bench press",
            isActive: true,
          },
        ],
      ]),
    );
    updateForMember.mockResolvedValue(undefined);

    await addCatalogExerciseToPersonalWorkout(memberCtx, "w1", "cat-bench");

    expect(getForMember).toHaveBeenCalledWith(
      memberCtx,
      "gym-a",
      "member-a",
      "w1",
    );
    expect(updateForMember).toHaveBeenCalledWith(
      memberCtx,
      "gym-a",
      "member-a",
      "w1",
      {
        name: "Push day",
        exercises: [
          expect.objectContaining({
            catalogId: "cat-bench",
            targetSets: 3,
            targetReps: "10",
            sortOrder: 0,
          }),
        ],
      },
    );
  });

  it("refuses when workout belongs to another member", async () => {
    getForMember.mockResolvedValue(null);
    await expect(
      addCatalogExerciseToPersonalWorkout(memberCtx, "w-other", "cat-1"),
    ).rejects.toThrow("Workout not found.");
    expect(updateForMember).not.toHaveBeenCalled();
  });

  it("does not append when the catalog exercise is already in the workout", async () => {
    getForMember.mockResolvedValue({
      id: "w1",
      gymId: "gym-a",
      memberId: "member-a",
      name: "Push day",
      exercises: [
        {
          id: "ex-1",
          catalogId: "cat-bench",
          sortOrder: 0,
          targetSets: 3,
          targetReps: "10",
        },
      ],
    });

    await addCatalogExerciseToPersonalWorkout(memberCtx, "w1", "cat-bench");

    expect(getByCatalogIds).not.toHaveBeenCalled();
    expect(updateForMember).not.toHaveBeenCalled();
  });
});

describe("addCatalogExercisesToPersonalWorkout", () => {
  const getForMember = vi.fn();
  const getByCatalogIds = vi.fn();
  const updateForMember = vi.fn();

  beforeEach(() => {
    getForMember.mockReset();
    getByCatalogIds.mockReset();
    updateForMember.mockReset();
    vi.mocked(getRepositories).mockReturnValue({
      memberPersonalWorkouts: {
        getForMember,
        updateForMember,
      },
      exerciseCatalog: {
        getByCatalogIds,
      },
    } as never);
  });

  it("appends multiple exercises in one update and dedupes catalog ids", async () => {
    getForMember.mockResolvedValue({
      id: "w1",
      gymId: "gym-a",
      memberId: "member-a",
      name: DEFAULT_PERSONAL_WORKOUT_NAME,
      exercises: [],
    });
    getByCatalogIds.mockResolvedValue(
      new Map([
        ["cat-a", { catalogId: "cat-a", isActive: true }],
        ["cat-b", { catalogId: "cat-b", isActive: true }],
      ]),
    );
    updateForMember.mockResolvedValue(undefined);

    const result = await addCatalogExercisesToPersonalWorkout(
      memberCtx,
      "w1",
      ["cat-a", "cat-b", "cat-a"],
    );

    expect(result.addedCount).toBe(2);
    expect(updateForMember).toHaveBeenCalledTimes(1);
    expect(updateForMember.mock.calls[0]?.[4]?.exercises).toHaveLength(2);
  });

  it("skips exercises already in the workout and returns addedCount for new ids only", async () => {
    getForMember.mockResolvedValue({
      id: "w1",
      gymId: "gym-a",
      memberId: "member-a",
      name: DEFAULT_PERSONAL_WORKOUT_NAME,
      exercises: [
        {
          id: "ex-1",
          catalogId: "cat-a",
          sortOrder: 0,
          targetSets: 3,
          targetReps: "10",
        },
      ],
    });
    getByCatalogIds.mockResolvedValue(
      new Map([["cat-b", { catalogId: "cat-b", isActive: true }]]),
    );
    updateForMember.mockResolvedValue(undefined);

    const result = await addCatalogExercisesToPersonalWorkout(
      memberCtx,
      "w1",
      ["cat-a", "cat-b", "cat-b"],
    );

    expect(result.addedCount).toBe(1);
    expect(getByCatalogIds).toHaveBeenCalledWith(memberCtx, ["cat-b"]);
    const exercises = updateForMember.mock.calls[0]?.[4]?.exercises;
    expect(exercises).toHaveLength(2);
    expect(exercises?.[0]?.catalogId).toBe("cat-a");
    expect(exercises?.[1]?.catalogId).toBe("cat-b");
  });

  it("is idempotent when every requested catalog id is already present", async () => {
    getForMember.mockResolvedValue({
      id: "w1",
      gymId: "gym-a",
      memberId: "member-a",
      name: "Push",
      exercises: [
        {
          id: "ex-1",
          catalogId: "cat-a",
          sortOrder: 0,
          targetSets: 3,
          targetReps: "10",
        },
      ],
    });

    const result = await addCatalogExercisesToPersonalWorkout(
      memberCtx,
      "w1",
      ["cat-a"],
    );

    expect(result.addedCount).toBe(0);
    expect(getByCatalogIds).not.toHaveBeenCalled();
    expect(updateForMember).not.toHaveBeenCalled();
  });
});

describe("createMemberPersonalWorkout and detail reload", () => {
  const listForMember = vi.fn();
  const createForMember = vi.fn();
  const getForMember = vi.fn();
  const getByCatalogIds = vi.fn();

  beforeEach(() => {
    listForMember.mockReset();
    createForMember.mockReset();
    getForMember.mockReset();
    getByCatalogIds.mockReset();
    vi.mocked(getRepositories).mockReturnValue({
      memberPersonalWorkouts: {
        listForMember,
        createForMember,
        getForMember,
      },
      exerciseCatalog: {
        getByCatalogIds,
      },
    } as never);
  });

  it("creates a workout and lists it for the member", async () => {
    createForMember.mockResolvedValue({
      id: "new-w",
      gymId: "gym-a",
      memberId: "member-a",
      name: DEFAULT_PERSONAL_WORKOUT_NAME,
      exercises: [],
    });
    listForMember.mockResolvedValue([
      {
        id: "new-w",
        gymId: "gym-a",
        memberId: "member-a",
        name: DEFAULT_PERSONAL_WORKOUT_NAME,
        exercises: [],
        updatedAt: { toDate: () => new Date() },
      },
    ]);

    const id = await createMemberPersonalWorkout(
      memberCtx,
      DEFAULT_PERSONAL_WORKOUT_NAME,
    );
    expect(id).toBeTruthy();
    expect(createForMember).toHaveBeenCalledWith(
      memberCtx,
      "gym-a",
      "member-a",
      id,
      { name: DEFAULT_PERSONAL_WORKOUT_NAME, exercises: [] },
    );

    const rows = await listMemberPersonalWorkouts(memberCtx);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe(DEFAULT_PERSONAL_WORKOUT_NAME);
  });

  it("returns saved exercises when reopening a personal workout", async () => {
    getForMember.mockResolvedValue({
      id: "w1",
      gymId: "gym-a",
      memberId: "member-a",
      name: "Push",
      exercises: [
        {
          id: "ex-1",
          catalogId: "cat-bench",
          sortOrder: 0,
          targetSets: 4,
          targetReps: "8",
        },
      ],
    });
    getByCatalogIds.mockResolvedValue(
      new Map([
        [
          "cat-bench",
          {
            catalogId: "cat-bench",
            name: "Bench press",
            muscleGroup: "Chest",
            isActive: true,
          },
        ],
      ]),
    );

    const detail = await getMemberPersonalWorkoutDetail(memberCtx, "w1");
    expect(detail?.exercises).toHaveLength(1);
    expect(detail?.exercises[0]).toMatchObject({
      catalogId: "cat-bench",
      targetSets: 4,
      targetReps: "8",
      displayName: "Bench press",
    });
  });
});
