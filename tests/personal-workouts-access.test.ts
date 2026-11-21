import { describe, expect, it, vi } from "vitest";

import type { MemberContext } from "@/lib/firestore/context";
import {
  isPersonalWorkoutsEnabled,
  memberPlanShowsPersonalWorkouts,
  PersonalWorkoutsAccessError,
} from "@/lib/member-portal/personal-workouts-policy";
import { requireMemberPersonalWorkoutsAccess } from "@/lib/member-portal/personal-workouts-access";
import { canManageMemberPersonalWorkoutsAccess } from "@/lib/permissions";

vi.mock("@/lib/firestore", () => ({
  getRepositories: vi.fn(),
}));

import { getRepositories } from "@/lib/firestore";

const memberCtx: MemberContext = {
  kind: "member",
  gymId: "gym-a",
  memberId: "member-a",
};

describe("personalWorkoutsEnabled", () => {
  it("defaults legacy members to locked", () => {
    expect(isPersonalWorkoutsEnabled({})).toBe(false);
    expect(isPersonalWorkoutsEnabled(null)).toBe(false);
    expect(isPersonalWorkoutsEnabled({ personalWorkoutsEnabled: undefined })).toBe(
      false,
    );
  });

  it("is true only when explicitly enabled", () => {
    expect(isPersonalWorkoutsEnabled({ personalWorkoutsEnabled: true })).toBe(
      true,
    );
    expect(isPersonalWorkoutsEnabled({ personalWorkoutsEnabled: false })).toBe(
      false,
    );
  });
});

describe("memberPlanShowsPersonalWorkouts", () => {
  it("hides personal workouts under All when locked", () => {
    expect(memberPlanShowsPersonalWorkouts("all", false)).toBe(false);
    expect(memberPlanShowsPersonalWorkouts("mine", false)).toBe(false);
    expect(memberPlanShowsPersonalWorkouts("trainer", false)).toBe(false);
  });

  it("shows personal section under All and Mine when enabled", () => {
    expect(memberPlanShowsPersonalWorkouts("all", true)).toBe(true);
    expect(memberPlanShowsPersonalWorkouts("mine", true)).toBe(true);
    expect(memberPlanShowsPersonalWorkouts("trainer", true)).toBe(false);
  });
});

describe("canManageMemberPersonalWorkoutsAccess", () => {
  it("allows owner and admin only", () => {
    expect(canManageMemberPersonalWorkoutsAccess("OWNER")).toBe(true);
    expect(canManageMemberPersonalWorkoutsAccess("ADMIN")).toBe(true);
    expect(canManageMemberPersonalWorkoutsAccess("STAFF")).toBe(false);
    expect(canManageMemberPersonalWorkoutsAccess(undefined)).toBe(false);
  });
});

describe("requireMemberPersonalWorkoutsAccess", () => {
  it("throws when member is locked", async () => {
    const findByIdAndGym = vi.fn().mockResolvedValue({
      id: "member-a",
      gymId: "gym-a",
      personalWorkoutsEnabled: false,
    });
    vi.mocked(getRepositories).mockReturnValue({
      members: { findByIdAndGym },
    } as never);

    await expect(requireMemberPersonalWorkoutsAccess(memberCtx)).rejects.toBeInstanceOf(
      PersonalWorkoutsAccessError,
    );
    expect(findByIdAndGym).toHaveBeenCalledWith(
      memberCtx,
      "member-a",
      "gym-a",
    );
  });

  it("returns member when enabled", async () => {
    const doc = {
      id: "member-a",
      gymId: "gym-a",
      personalWorkoutsEnabled: true,
    };
    const findByIdAndGym = vi.fn().mockResolvedValue(doc);
    vi.mocked(getRepositories).mockReturnValue({
      members: { findByIdAndGym },
    } as never);

    const member = await requireMemberPersonalWorkoutsAccess(memberCtx);
    expect(member).toEqual(doc);
    expect(findByIdAndGym).toHaveBeenCalledWith(
      memberCtx,
      "member-a",
      "gym-a",
    );
  });
});
