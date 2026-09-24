import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffContext } from "@/lib/firestore/context";
import {
  WORKOUT_PLANS_PAGE_SIZE,
  WorkoutPlansRepository,
} from "@/lib/firestore/repositories/workout-plans";
import type { WorkoutPlanDoc } from "@/lib/firestore/types";
import {
  getWorkoutPlanNewPageData,
  getWorkoutPlansPageData,
} from "@/lib/workout-plans";

const mockWorkoutPlans = {
  listWorkoutPlanPage: vi.fn(),
  listAssignedMemberIds: vi.fn(),
  listAllForExport: vi.fn(),
};

const mockMembers = {
  listMemberOptions: vi.fn(),
};

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    workoutPlans: mockWorkoutPlans,
    members: mockMembers,
  }),
  platformContext: { kind: "platform" },
}));

const staffCtx: StaffContext = {
  kind: "staff",
  userId: "staff-1",
  gymId: "gym-a",
  role: "OWNER",
};

function planDoc(
  id: string,
  memberId: string,
  memberName: string,
): WorkoutPlanDoc & { id: string } {
  return {
    id,
    gymId: "gym-a",
    memberId,
    memberName,
    title: `${memberName} plan`,
    durationWeeks: null,
    focusGoal: null,
    level: null,
    weeklySchedule: null,
    days: [],
    createdAt: {} as never,
    updatedAt: {} as never,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMembers.listMemberOptions.mockResolvedValue([
    { id: "member-1", name: "Alice" },
    { id: "member-2", name: "Bob" },
    { id: "member-3", name: "Charlie" },
  ]);
  mockWorkoutPlans.listAssignedMemberIds.mockResolvedValue(["member-1", "member-2"]);
  mockWorkoutPlans.listWorkoutPlanPage.mockResolvedValue({
    items: [planDoc("plan-1", "member-1", "Alice")],
    total: 2,
    page: 1,
    pageSize: WORKOUT_PLANS_PAGE_SIZE,
  });
});

describe("getWorkoutPlansPageData", () => {
  it("does not call listAllForExport during routine page loading", async () => {
    await getWorkoutPlansPageData("gym-a", 1);

    expect(mockWorkoutPlans.listAssignedMemberIds).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
    );
    expect(mockWorkoutPlans.listAllForExport).not.toHaveBeenCalled();
    expect(mockWorkoutPlans.listWorkoutPlanPage).toHaveBeenCalledWith(
      { kind: "platform" },
      "gym-a",
      { page: 1, pageSize: WORKOUT_PLANS_PAGE_SIZE },
    );
  });

  it("returns assigned member ids from the targeted query", async () => {
    const page = await getWorkoutPlansPageData("gym-a", 1);

    expect(page.assignedMemberIds).toEqual(["member-1", "member-2"]);
    expect(page.plans).toHaveLength(1);
    expect(page.plans[0]?.memberId).toBe("member-1");
    expect(page.total).toBe(2);
  });

  it("supports gyms with no workout plans", async () => {
    mockWorkoutPlans.listAssignedMemberIds.mockResolvedValue([]);
    mockWorkoutPlans.listWorkoutPlanPage.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: WORKOUT_PLANS_PAGE_SIZE,
    });

    const page = await getWorkoutPlansPageData("gym-a", 1);

    expect(page.assignedMemberIds).toEqual([]);
    expect(page.plans).toEqual([]);
    expect(page.total).toBe(0);
  });
});

describe("getWorkoutPlanNewPageData", () => {
  it("loads only member options and assigned member ids", async () => {
    const data = await getWorkoutPlanNewPageData("gym-a");

    expect(data.members).toHaveLength(3);
    expect(data.assignedMemberIds).toEqual(["member-1", "member-2"]);
    expect(mockWorkoutPlans.listWorkoutPlanPage).not.toHaveBeenCalled();
    expect(mockWorkoutPlans.listAllForExport).not.toHaveBeenCalled();
    expect(mockWorkoutPlans.listAssignedMemberIds).toHaveBeenCalledTimes(1);
    expect(mockMembers.listMemberOptions).toHaveBeenCalledTimes(1);
  });
});

describe("WorkoutPlansRepository.listAssignedMemberIds", () => {
  function planSnapshot(
    id: string,
    gymId: string,
    memberId: string,
    memberName: string,
  ) {
    return {
      id,
      data: () => ({
        gymId,
        memberId,
        memberName,
      }),
    };
  }

  function buildRepo(
    getMock: ReturnType<typeof vi.fn>,
    docsByBatch: Array<Array<ReturnType<typeof planSnapshot>>>,
  ) {
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
    return { repo, queryResult, getMock, where, select };
  }

  it("returns assigned member ids with projected-field pagination", async () => {
    const batchSize = WORKOUT_PLANS_PAGE_SIZE;
    const firstBatch = Array.from({ length: batchSize + 1 }, (_, index) =>
      planSnapshot(`plan-${index}`, "gym-a", `member-${index}`, `Member ${index}`),
    );
    const secondBatch = [
      planSnapshot("plan-z", "gym-a", "member-z", "Zed"),
    ];

    const { repo, queryResult, select } = buildRepo(
      vi.fn().mockResolvedValue({ exists: true }),
      [firstBatch, secondBatch],
    );

    const memberIds = await repo.listAssignedMemberIds(staffCtx, "gym-a");

    expect(memberIds).toHaveLength(batchSize + 1);
    expect(memberIds[0]).toBe("member-0");
    expect(memberIds[memberIds.length - 1]).toBe("member-z");
    expect(queryResult.get).toHaveBeenCalledTimes(2);
    expect(select).toHaveBeenCalledWith("gymId", "memberId", "memberName");
  });

  it("returns an empty list when the gym has no plans", async () => {
    const { repo } = buildRepo(vi.fn().mockResolvedValue({ exists: false }), [[]]);

    await expect(repo.listAssignedMemberIds(staffCtx, "gym-a")).resolves.toEqual([]);
  });

  it("ignores documents whose stored gymId does not match the requested gym", async () => {
    const { repo } = buildRepo(vi.fn().mockResolvedValue({ exists: false }), [
      [planSnapshot("plan-b", "gym-b", "member-b", "Bob")],
    ]);

    await expect(repo.listAssignedMemberIds(staffCtx, "gym-a")).resolves.toEqual([]);
  });

  it("scopes every query to the requested gymId", async () => {
    const { repo, where } = buildRepo(vi.fn().mockResolvedValue({ exists: false }), [[]]);

    await repo.listAssignedMemberIds(staffCtx, "gym-a");

    expect(where).toHaveBeenCalledWith("gymId", "==", "gym-a");
  });

  it("denies cross-gym access", async () => {
    const { repo } = buildRepo(vi.fn(), [[]]);

    await expect(
      repo.listAssignedMemberIds(staffCtx, "gym-b"),
    ).rejects.toThrow(/Tenant isolation violation/);
  });
});
