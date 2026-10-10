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
  parseMemberWorkoutTab,
} from "@/lib/member-portal/member-workout-tab-url";
import {
  addCatalogExerciseToPersonalWorkout,
  createMemberPersonalWorkout,
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
  it("parses tab query values", () => {
    expect(parseMemberWorkoutTab("mine")).toBe("mine");
    expect(parseMemberWorkoutTab("library")).toBe("library");
    expect(parseMemberWorkoutTab("assigned")).toBe("assigned");
    expect(parseMemberWorkoutTab("invalid")).toBe("assigned");
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
      "/member/workout/personal/w1/add-exercises",
    );
    expect(memberPersonalWorkoutAddExercisesHref("w1", "CHEST")).toBe(
      "/member/workout/personal/w1/add-exercises?group=CHEST",
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
  const getByCatalogId = vi.fn();
  const updateForMember = vi.fn();

  beforeEach(() => {
    getForMember.mockReset();
    getByCatalogId.mockReset();
    updateForMember.mockReset();
    vi.mocked(getRepositories).mockReturnValue({
      memberPersonalWorkouts: {
        getForMember,
        updateForMember,
      },
      exerciseCatalog: {
        getByCatalogId,
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
    getByCatalogId.mockResolvedValue({
      catalogId: "cat-bench",
      name: "Bench press",
      isActive: true,
    });
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
      name: "Leg day",
      exercises: [],
    });
    listForMember.mockResolvedValue([
      {
        id: "new-w",
        gymId: "gym-a",
        memberId: "member-a",
        name: "Leg day",
        exercises: [],
        updatedAt: { toDate: () => new Date() },
      },
    ]);

    const id = await createMemberPersonalWorkout(memberCtx, "Leg day");
    expect(id).toBeTruthy();
    expect(createForMember).toHaveBeenCalledWith(
      memberCtx,
      "gym-a",
      "member-a",
      id,
      { name: "Leg day", exercises: [] },
    );

    const rows = await listMemberPersonalWorkouts(memberCtx);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Leg day");
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
