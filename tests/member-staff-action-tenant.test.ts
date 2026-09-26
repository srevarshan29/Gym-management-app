import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireGym, findByIdAndGym, findByPhone, update, deleteMemberRepo } =
  vi.hoisted(() => ({
    requireGym: vi.fn(),
    findByIdAndGym: vi.fn(),
    findByPhone: vi.fn(),
    update: vi.fn(),
    deleteMemberRepo: vi.fn(),
  }));

import { deleteMember, updateMember } from "@/app/actions/members";

vi.mock("@/lib/session", () => ({
  requireGym,
}));

vi.mock("@/lib/permissions", () => ({
  canDeleteMembers: () => true,
  canLogPayments: () => true,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  uploadMemberPhoto: vi.fn(),
}));

vi.mock("@/lib/staff", () => ({
  validateTrainerForGym: vi.fn(async () => true),
}));

vi.mock("@/lib/firestore/visitor-operations", () => ({
  convertVisitorRecord: vi.fn(),
}));

vi.mock("@/lib/firestore/diet-plan-operations", () => ({
  deleteDietPlanForMember: vi.fn(async () => true),
}));

vi.mock("@/lib/firestore/workout-plan-operations", () => ({
  deleteWorkoutPlanForMember: vi.fn(async () => true),
}));

vi.mock("@/lib/firestore/pt-member-counter", () => ({
  adjustPtMemberCounter: vi.fn(),
  ptMemberCounterDelta: () => 0,
}));

vi.mock("@/lib/member-portal/email", () => ({
  findGymMembersByEmailFirestore: vi.fn(async () => []),
  DUPLICATE_MEMBER_EMAIL_MESSAGE: "dup",
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    members: {
      findByIdAndGym,
      findByPhone,
      update,
      delete: deleteMemberRepo,
    },
  }),
  platformContext: { kind: "platform" },
}));

describe("member staff actions tenant checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByPhone.mockResolvedValue(null);
    requireGym.mockResolvedValue({
      id: "staff-1",
      gymId: "gym-a",
      role: "OWNER",
      name: "Owner",
      email: "o@gym.test",
    });
  });

  it("updateMember verifies member belongs to staff gym before update", async () => {
    findByIdAndGym.mockResolvedValue({
      id: "member-b",
      gymId: "gym-a",
      isPt: false,
    });
    update.mockResolvedValue(true);

    const form = new FormData();
    form.set("id", "member-b");
    form.set("name", "Member B");
    form.set("phone", "9999999999");
    form.set("email", "b@test.com");
    form.set("gender", "PREFER_NOT_TO_SAY");
    form.set("isPt", "0");
    form.set("fitnessGoal", "");

    await updateMember(undefined, form);

    expect(findByIdAndGym).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "staff", gymId: "gym-a" }),
      "member-b",
      "gym-a",
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "staff", gymId: "gym-a" }),
      "gym-a",
      "member-b",
      expect.any(Object),
    );
  });

  it("updateMember rejects when member is not in staff gym", async () => {
    findByIdAndGym.mockResolvedValue(null);

    const form = new FormData();
    form.set("id", "member-other-gym");
    form.set("name", "X");
    form.set("phone", "9999999999");
    form.set("email", "x@test.com");
    form.set("gender", "PREFER_NOT_TO_SAY");
    form.set("isPt", "0");
    form.set("fitnessGoal", "");

    const result = await updateMember(undefined, form);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not found/i);
    }
    expect(update).not.toHaveBeenCalled();
  });

  it("deleteMember verifies member belongs to staff gym before delete", async () => {
    findByIdAndGym.mockResolvedValue({
      id: "member-b",
      gymId: "gym-a",
      isPt: false,
    });
    deleteMemberRepo.mockResolvedValue(true);

    const form = new FormData();
    form.set("id", "member-b");

    await deleteMember(form);

    expect(findByIdAndGym).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "staff", gymId: "gym-a" }),
      "member-b",
      "gym-a",
    );
    expect(deleteMemberRepo).toHaveBeenCalled();
  });
});
