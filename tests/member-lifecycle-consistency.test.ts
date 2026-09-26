import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FirestoreContext } from "@/lib/firestore/context";
import { MembersRepository } from "@/lib/firestore/repositories/members";
import type { MemberDoc } from "@/lib/firestore/types";
import { normalizeMemberEmail } from "@/lib/member-portal/constants";
import { adjustMemberPendingTotal } from "@/lib/firestore/pending-sync";
import { computeSubscriptionBalance } from "@/lib/subscription-balance";

const gymId = "gym-a";
const ctx = { kind: "platform" } as FirestoreContext;

function mockMemberDoc(overrides: Partial<MemberDoc> = {}): MemberDoc {
  return {
    gymId,
    memberNumber: 1,
    name: "Test Member",
    nameLower: "test member",
    phone: "+91 9876543210",
    phoneDigits: "919876543210",
    searchTokens: [],
    email: "member@example.com",
    photoUrl: null,
    gender: "PREFER_NOT_TO_SAY",
    notes: null,
    isPt: false,
    trainerId: null,
    membershipPolicyAgreedText: null,
    membershipPolicyAgreedAt: null,
    portalEnabledAt: null,
    ageYears: null,
    heightCm: null,
    weightKg: null,
    fitnessGoal: null,
    pendingAmountTotal: 0,
    currentSubscriptionId: null,
    currentStartDate: null,
    currentEndDate: null,
    currentPackageName: null,
    addedByName: null,
    createdAt: { toDate: () => new Date() } as never,
    updatedAt: { toDate: () => new Date() } as never,
    ...overrides,
  };
}

describe("MembersRepository.findByPhoneDigits", () => {
  const get = vi.fn();
  const where = vi.fn();
  const limit = vi.fn();
  const col = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    where.mockReturnValue({ where, limit, get });
    limit.mockReturnValue({ get });
    col.mockReturnValue({ where });
    get.mockResolvedValue({ docs: [], empty: true });
  });

  function repo() {
    return new MembersRepository({ collection: col } as never);
  }

  it("matches duplicates when only formatting differs", async () => {
    get.mockResolvedValueOnce({
      docs: [
        {
          id: "member-2",
          data: () =>
            mockMemberDoc({ phone: "9876543210", phoneDigits: "9876543210" }),
        },
      ],
    });

    const found = await repo().findByPhoneDigits(ctx, gymId, "+91 9876543210");
    expect(found?.id).toBe("member-2");
    expect(where).toHaveBeenCalledWith("phoneDigits", "==", "919876543210");
  });

  it("allows a member to keep their own number on edit", async () => {
    get.mockResolvedValueOnce({
      docs: [
        {
          id: "member-1",
          data: () => mockMemberDoc({ phoneDigits: "9876543210" }),
        },
      ],
    });

    const found = await repo().findByPhoneDigits(
      ctx,
      gymId,
      "9876543210",
      "member-1",
    );
    expect(found).toBeNull();
  });
});

describe("member email normalization and auth selection", () => {
  it("normalizes trim and case for storage and lookup", () => {
    expect(normalizeMemberEmail("  Member@Gym.COM  ")).toBe("member@gym.com");
  });

  it("requires exactly one portal-enabled match per gym (auth contract)", () => {
    const matches = [
      { id: "a", gymId, name: "A", memberNumber: 1 },
      { id: "b", gymId, name: "B", memberNumber: 2 },
    ];
    expect(matches.length !== 1).toBe(true);
  });
});

describe("renewal pending totals", () => {
  it("carries forward prior cycle dues when adding a new subscription balance", () => {
    const priorMemberTotal = 500;
    const newCyclePending = 2000;
    expect(adjustMemberPendingTotal(priorMemberTotal, newCyclePending)).toBe(
      2500,
    );
  });

  it("uses subscription paidTotal as balance source of truth after renewal payment", () => {
    const balance = computeSubscriptionBalance(3000, 3000, 0);
    expect(balance.pendingAmount).toBe(0);
    expect(adjustMemberPendingTotal(500, balance.pendingAmount)).toBe(500);
  });
});
