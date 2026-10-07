import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MemberContext } from "@/lib/firestore/context";
import { NutritionLogsRepository } from "@/lib/firestore/repositories/nutrition-logs";

const memberA: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-a",
};

function mockLogDoc(memberId: string, gymId = "gym-a") {
  return {
    id: "log-1",
    gymId,
    memberId,
    logDate: "2026-10-07",
    mealType: "breakfast" as const,
    foodId: "usda:123",
    foodName: "Apple",
    quantityGrams: 100,
    calories: 52,
    proteinGrams: 0.3,
    carbsGrams: 14,
    fatGrams: 0.2,
    fiberGrams: 2.4,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

describe("NutritionLogsRepository member isolation", () => {
  const getMock = vi.fn();
  const deleteMock = vi.fn();

  beforeEach(() => {
    getMock.mockReset();
    deleteMock.mockReset();
  });

  it("blocks delete when memberId does not match the log", async () => {
    getMock.mockResolvedValue({
      exists: true,
      id: "log-1",
      data: () => mockLogDoc("member-other"),
    });

    const repo = new NutritionLogsRepository({
      collection: () => ({
        doc: () => ({
          get: getMock,
          delete: deleteMock,
        }),
      }),
    } as never);

    await expect(
      repo.deleteLog(memberA, "gym-a", "member-a", "log-1"),
    ).rejects.toThrow(/Member isolation/);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("blocks delete when gym tenant does not match member context", async () => {
    getMock.mockResolvedValue({
      exists: true,
      id: "log-1",
      data: () => mockLogDoc("member-b", "gym-b"),
    });

    const repo = new NutritionLogsRepository({
      collection: () => ({
        doc: () => ({
          get: getMock,
          delete: deleteMock,
        }),
      }),
    } as never);

    await expect(
      repo.deleteLog(memberA, "gym-a", "member-a", "log-1"),
    ).rejects.toThrow(/not found|Tenant isolation/i);
  });
});
