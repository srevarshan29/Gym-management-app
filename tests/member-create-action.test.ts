import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const createMemberWithSubscriptionMock = vi.fn();
const findByPhoneMock = vi.fn();
const findPackageByIdMock = vi.fn();
const findByIdAndGymMock = vi.fn();
const updateMemberMock = vi.fn();
const findGymMembersByEmailMock = vi.fn();
const getMembershipPolicyForGymMock = vi.fn();
const afterMemberRegisteredMock = vi.fn();
const schedulePaymentLoggedMock = vi.fn();

const staffUser = {
  gymId: "gym-1",
  id: "staff-1",
  name: "Staff User",
  email: "staff@example.com",
  role: "OWNER",
};

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireGym: vi.fn(() => Promise.resolve(staffUser)),
}));

vi.mock("@/lib/firestore/session-context", () => ({
  staffContextFromUser: (user: typeof staffUser) => ({
    kind: "staff",
    gymId: user.gymId,
    staffId: user.id,
  }),
}));

vi.mock("@/lib/firestore/pt-member-counter", () => ({
  adjustPtMemberCounter: vi.fn(),
  ptMemberCounterDelta: vi.fn(() => 0),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    members: {
      findByPhone: findByPhoneMock,
      findByIdAndGym: findByIdAndGymMock,
      update: updateMemberMock,
    },
    packages: { findById: findPackageByIdMock },
  }),
  createMemberWithSubscription: (...args: unknown[]) =>
    createMemberWithSubscriptionMock(...args),
}));

vi.mock("@/lib/member-portal/email", () => ({
  findGymMembersByEmailFirestore: (...args: unknown[]) =>
    findGymMembersByEmailMock(...args),
  DUPLICATE_MEMBER_EMAIL_MESSAGE: "duplicate email",
}));

vi.mock("@/lib/gym-profile", () => ({
  getMembershipPolicyForGym: (...args: unknown[]) =>
    getMembershipPolicyForGymMock(...args),
}));

vi.mock("@/lib/member-portal-invitation/on-member-created", () => ({
  afterMemberRegistered: (...args: unknown[]) => afterMemberRegisteredMock(...args),
}));

vi.mock("@/lib/notifications", () => ({
  schedulePaymentLogged: (...args: unknown[]) => schedulePaymentLoggedMock(...args),
}));

vi.mock("@/lib/storage", () => ({
  uploadMemberPhoto: vi.fn(),
}));

vi.mock("@/lib/firestore/visitor-operations", () => ({
  convertVisitorRecord: vi.fn(),
}));

function validFields(
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    name: "Jane Doe",
    phone: "+919876543210",
    email: "jane@example.com",
    gender: "FEMALE",
    fitnessGoal: "GENERAL_FITNESS",
    ageYears: "28",
    heightCm: "165",
    weightKg: "62",
    packageId: "pkg-1",
    agreedMembershipPrice: "1500",
    logPayment: "0",
    method: "CASH",
    isPt: "0",
    ...overrides,
  };
}

function toFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("createMember server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByPhoneMock.mockResolvedValue(null);
    findGymMembersByEmailMock.mockResolvedValue([]);
    getMembershipPolicyForGymMock.mockResolvedValue(null);
    findPackageByIdMock.mockResolvedValue({
      id: "pkg-1",
      name: "Monthly",
      price: 1500,
      durationValue: 1,
      durationUnit: "MONTH",
    });
    createMemberWithSubscriptionMock.mockResolvedValue({
      memberId: "member-new",
      paymentId: null,
    });
    afterMemberRegisteredMock.mockResolvedValue(undefined);
  });

  async function callCreateMember(fields: Record<string, string>) {
    const { createMember } = await import("@/app/actions/members");
    return createMember(undefined, toFormData(fields));
  }

  async function callCreateMemberExpectRedirect(fields: Record<string, string>) {
    const { createMember } = await import("@/app/actions/members");
    await expect(createMember(undefined, toFormData(fields))).rejects.toThrow(
      /REDIRECT:/,
    );
  }

  it("calls billing with valid bio and standard agreed price", async () => {
    await callCreateMemberExpectRedirect(validFields());

    expect(createMemberWithSubscriptionMock).toHaveBeenCalledTimes(1);
    expect(createMemberWithSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane Doe",
        gender: "FEMALE",
        fitnessGoal: "GENERAL_FITNESS",
        ageYears: 28,
        heightCm: 165,
        weightKg: 62,
        packagePrice: 1500,
        originalPackagePrice: 1500,
        discountAmount: 0,
      }),
    );
    expect(afterMemberRegisteredMock).toHaveBeenCalled();
  });

  const missingFieldCases: [string, Record<string, string>, string?][] = [
    ["name", { name: "" }, "Name is required"],
    ["phone", { phone: "" }, "Phone number is required"],
    ["email", { email: "" }, "Email is required"],
    ["gender", { gender: "" }],
    ["fitnessGoal", { fitnessGoal: "" }],
    ["ageYears", { ageYears: "" }, "Age is required."],
    ["heightCm", { heightCm: "" }, "Height is required."],
    ["weightKg", { weightKg: "" }, "Weight is required."],
  ];

  it.each(missingFieldCases)(
    "rejects missing %s without billing",
    async (_field, patch, expectedMessage) => {
      const result = await callCreateMember(validFields(patch));
      expect(result?.ok).toBe(false);
      if (expectedMessage && result && !result.ok) {
        expect(result.error).toBe(expectedMessage);
      }
      expect(createMemberWithSubscriptionMock).not.toHaveBeenCalled();
      expect(findPackageByIdMock).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid age, height and weight without billing", async () => {
    const patches: Record<string, string>[] = [
      { ageYears: "0" },
      { heightCm: "30" },
      { weightKg: "10" },
    ];
    for (const patch of patches) {
      createMemberWithSubscriptionMock.mockClear();
      findPackageByIdMock.mockClear();
      const result = await callCreateMember(validFields(patch));
      expect(result?.ok).toBe(false);
      expect(createMemberWithSubscriptionMock).not.toHaveBeenCalled();
      expect(findPackageByIdMock).not.toHaveBeenCalled();
    }
  });

  it("rejects invalid gender and fitness goal without billing", async () => {
    const genderResult = await callCreateMember(
      validFields({ gender: "NOT_VALID" }),
    );
    expect(genderResult?.ok).toBe(false);
    expect(createMemberWithSubscriptionMock).not.toHaveBeenCalled();

    createMemberWithSubscriptionMock.mockClear();
    const goalResult = await callCreateMember(
      validFields({ fitnessGoal: "NOT_A_GOAL" }),
    );
    expect(goalResult?.ok).toBe(false);
    expect(createMemberWithSubscriptionMock).not.toHaveBeenCalled();
  });

  it("passes agreed price and server-calculated discount to billing", async () => {
    await callCreateMemberExpectRedirect(
      validFields({ agreedMembershipPrice: "1000", logPayment: "1", amount: "1000" }),
    );

    expect(createMemberWithSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        packagePrice: 1000,
        originalPackagePrice: 1500,
        discountAmount: 500,
        logPayment: true,
        paymentAmount: 1000,
      }),
    );
    expect(findPackageByIdMock).toHaveBeenCalled();
  });

  it("ignores browser-submitted discount and uses server calculation", async () => {
    const fd = toFormData(
      validFields({ agreedMembershipPrice: "1200", discountAmount: "9999" }),
    );
    fd.set("discountAmount", "9999");

    const { createMember } = await import("@/app/actions/members");
    await expect(createMember(undefined, fd)).rejects.toThrow(/REDIRECT:/);

    expect(createMemberWithSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        packagePrice: 1200,
        originalPackagePrice: 1500,
        discountAmount: 300,
      }),
    );
    const call = createMemberWithSubscriptionMock.mock.calls[0]![0] as {
      discountAmount: number;
    };
    expect(call.discountAmount).not.toBe(9999);
  });

  it("rejects agreed price above package standard without billing", async () => {
    const result = await callCreateMember(
      validFields({ agreedMembershipPrice: "2000" }),
    );
    expect(result?.ok).toBe(false);
    expect(createMemberWithSubscriptionMock).not.toHaveBeenCalled();
  });

  it("still redirects and schedules receipt when payment is logged", async () => {
    createMemberWithSubscriptionMock.mockResolvedValue({
      memberId: "member-pay",
      paymentId: "pay-1",
    });
    const { createMember } = await import("@/app/actions/members");
    await expect(
      createMember(
        undefined,
        toFormData(
          validFields({ logPayment: "1", amount: "500", agreedMembershipPrice: "1000" }),
        ),
      ),
    ).rejects.toThrow("REDIRECT:/members/member-pay?receipt=pay-1");

    expect(schedulePaymentLoggedMock).toHaveBeenCalledWith("gym-1", "pay-1");
    expect(createMemberWithSubscriptionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        packagePrice: 1000,
        paymentAmount: 500,
      }),
    );
  });

  it("invitation hook failure cannot block registration redirect", async () => {
    afterMemberRegisteredMock.mockRejectedValue(new Error("invite down"));
    const { createMember } = await import("@/app/actions/members");
    await expect(createMember(undefined, toFormData(validFields()))).rejects.toThrow(
      /REDIRECT:\/members\/member-new/,
    );
    expect(createMemberWithSubscriptionMock).toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/members/member-new");
  });
});

describe("updateMember server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByPhoneMock.mockResolvedValue(null);
    findGymMembersByEmailMock.mockResolvedValue([]);
    findByIdAndGymMock.mockResolvedValue({ id: "m1", isPt: false });
    updateMemberMock.mockResolvedValue({ id: "m1" });
  });

  it("allows incomplete legacy body metrics on edit", async () => {
    const { updateMember } = await import("@/app/actions/members");
    const fd = new FormData();
    fd.set("id", "m1");
    fd.set("name", "Jane");
    fd.set("phone", "+919999999999");
    fd.set("email", "");
    fd.set("gender", "FEMALE");
    fd.set("fitnessGoal", "");
    fd.set("ageYears", "");
    fd.set("heightCm", "");
    fd.set("weightKg", "");
    fd.set("isPt", "0");

    await expect(updateMember(undefined, fd)).rejects.toThrow(/REDIRECT:/);
    expect(createMemberWithSubscriptionMock).not.toHaveBeenCalled();
    expect(updateMemberMock).toHaveBeenCalledWith(
      expect.anything(),
      "gym-1",
      "m1",
      expect.objectContaining({
        ageYears: null,
        heightCm: null,
        weightKg: null,
        fitnessGoal: null,
      }),
    );
  });
});
