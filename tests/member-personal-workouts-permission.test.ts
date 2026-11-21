import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireGym = vi.fn();
const mockFindByIdAndGym = vi.fn();
const mockFindByPhone = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/session", () => ({
  requireGym: () => mockRequireGym(),
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

vi.mock("@/lib/member-portal/email", () => ({
  findGymMembersByEmailFirestore: vi.fn(async () => []),
  DUPLICATE_MEMBER_EMAIL_MESSAGE: "dup",
}));

vi.mock("@/lib/firestore/pt-member-counter", () => ({
  adjustPtMemberCounter: vi.fn(),
  ptMemberCounterDelta: () => 0,
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    members: {
      findByIdAndGym: mockFindByIdAndGym,
      findByPhone: mockFindByPhone,
      update: mockUpdate,
    },
  }),
}));

import { updateMember } from "@/app/actions/members";

function staffForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("id", "member-a");
  fd.set("name", "Alex");
  fd.set("phone", "9999999999");
  fd.set("gender", "MALE");
  fd.set("isPt", "0");
  fd.set("personalWorkoutsEnabled", "1");
  for (const [key, value] of Object.entries(overrides)) {
    fd.set(key, value);
  }
  return fd;
}

describe("member personal workouts admin permission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindByPhone.mockResolvedValue(null);
    mockFindByIdAndGym.mockResolvedValue({
      id: "member-a",
      gymId: "gym-a",
      isPt: false,
      personalWorkoutsEnabled: false,
    });
    mockUpdate.mockResolvedValue(true);
  });

  it("allows owner to grant access", async () => {
    mockRequireGym.mockResolvedValue({ gymId: "gym-a", role: "OWNER" });
    await updateMember(undefined, staffForm());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(),
      "gym-a",
      "member-a",
      expect.objectContaining({ personalWorkoutsEnabled: true }),
    );
  });

  it("allows admin to revoke access", async () => {
    mockRequireGym.mockResolvedValue({ gymId: "gym-a", role: "ADMIN" });
    mockFindByIdAndGym.mockResolvedValue({
      id: "member-a",
      gymId: "gym-a",
      isPt: false,
      personalWorkoutsEnabled: true,
    });
    await updateMember(undefined, staffForm({ personalWorkoutsEnabled: "0" }));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(),
      "gym-a",
      "member-a",
      expect.objectContaining({ personalWorkoutsEnabled: false }),
    );
  });

  it("ignores staff attempts to enable personal workouts", async () => {
    mockRequireGym.mockResolvedValue({ gymId: "gym-a", role: "STAFF" });
    await updateMember(undefined, staffForm());
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(),
      "gym-a",
      "member-a",
      expect.objectContaining({ personalWorkoutsEnabled: false }),
    );
  });
});
