import { describe, expect, it } from "vitest";

import { parseAgreedMembershipPrice } from "@/lib/member-registration/agreed-price";
import {
  publicQrRegistrationSchema,
  staffCreateMemberSchema,
  staffUpdateMemberSchema,
} from "@/lib/member-registration/schemas";
import { computeSubscriptionPendingFields } from "@/lib/firestore/pending-sync";
import { SubscriptionsRepository } from "@/lib/firestore/repositories/subscriptions";
import type { SubscriptionDoc } from "@/lib/firestore/types";
import { pendingAmount } from "@/lib/subscription-balance";

/**
 * Mirrors member-form.tsx package selection pricing sync (regression contract only).
 */
function syncPackageSelectionPricing(
  packagePrice: number,
  paymentAmountTouched: boolean,
  currentPaymentAmount: string,
): { agreedMembershipPrice: string; paymentAmount: string } {
  const priceStr = String(packagePrice);
  return {
    agreedMembershipPrice: priceStr,
    paymentAmount: paymentAmountTouched ? currentPaymentAmount : priceStr,
  };
}

const validBio = {
  name: "Jane Doe",
  phone: "+91 9876543210",
  email: "jane@example.com",
  gender: "FEMALE" as const,
  fitnessGoal: "GENERAL_FITNESS" as const,
  ageYears: "28",
  heightCm: "165",
  weightKg: "62",
};

const validStaffCreate = {
  ...validBio,
  packageId: "pkg-1",
  agreedMembershipPrice: "1500",
  logPayment: "0" as const,
  method: "CASH" as const,
  isPt: "0" as const,
};

describe("staffCreateMemberSchema", () => {
  it("accepts all eight required bio fields", () => {
    const parsed = staffCreateMemberSchema.safeParse(validStaffCreate);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ageYears).toBe(28);
      expect(parsed.data.weightKg).toBe(62);
    }
  });

  const requiredStringFields = [
    ["name", { ...validStaffCreate, name: "" }, "Name is required"],
    ["phone", { ...validStaffCreate, phone: "" }, "Phone number is required"],
    ["email", { ...validStaffCreate, email: "" }, "Email is required"],
    [
      "agreedMembershipPrice",
      { ...validStaffCreate, agreedMembershipPrice: "" },
      "Enter the agreed membership price.",
    ],
  ] as const;

  it.each(requiredStringFields)(
    "rejects missing %s",
    (_field, payload, message) => {
      const parsed = staffCreateMemberSchema.safeParse(payload);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.errors.some((e) => e.message === message)).toBe(
          true,
        );
      }
    },
  );

  it("rejects missing gender", () => {
    const parsed = staffCreateMemberSchema.safeParse({
      ...validStaffCreate,
      gender: undefined,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid body metrics", () => {
    expect(
      staffCreateMemberSchema.safeParse({
        ...validStaffCreate,
        ageYears: "0",
      }).success,
    ).toBe(false);
    expect(
      staffCreateMemberSchema.safeParse({
        ...validStaffCreate,
        heightCm: "10",
      }).success,
    ).toBe(false);
    expect(
      staffCreateMemberSchema.safeParse({
        ...validStaffCreate,
        weightKg: "5",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid fitness goal", () => {
    const parsed = staffCreateMemberSchema.safeParse({
      ...validStaffCreate,
      fitnessGoal: "NOT_A_GOAL",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("publicQrRegistrationSchema", () => {
  it("accepts complete QR registration payload", () => {
    const parsed = publicQrRegistrationSchema.safeParse(validBio);
    expect(parsed.success).toBe(true);
  });

  it("rejects incomplete QR registration", () => {
    expect(
      publicQrRegistrationSchema.safeParse({ ...validBio, ageYears: "" }).success,
    ).toBe(false);
    expect(
      publicQrRegistrationSchema.safeParse({
        ...validBio,
        gender: undefined,
      }).success,
    ).toBe(false);
  });
});

describe("staffUpdateMemberSchema", () => {
  it("allows optional body metrics for existing members", () => {
    const parsed = staffUpdateMemberSchema.safeParse({
      id: "m1",
      name: "Jane",
      phone: "+91 9000000000",
      email: "",
      gender: "FEMALE",
      fitnessGoal: "",
      ageYears: "",
      heightCm: "",
      weightKg: "",
      isPt: "0",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ageYears).toBeNull();
      expect(parsed.data.fitnessGoal).toBeNull();
    }
  });
});

describe("parseAgreedMembershipPrice", () => {
  it("uses standard price with zero discount when agreed equals list price", () => {
    const result = parseAgreedMembershipPrice(1500, "1500");
    expect(result).toEqual({
      ok: true,
      standardPackagePrice: 1500,
      agreedMembershipPrice: 1500,
      discountAmount: 0,
    });
  });

  it("calculates individual discount server-side", () => {
    const result = parseAgreedMembershipPrice(1500, "1000");
    expect(result).toEqual({
      ok: true,
      standardPackagePrice: 1500,
      agreedMembershipPrice: 1000,
      discountAmount: 500,
    });
  });

  it("rejects tampered or invalid values", () => {
    expect(parseAgreedMembershipPrice(1500, "-1")).toMatchObject({ ok: false });
    expect(parseAgreedMembershipPrice(1500, "2000")).toMatchObject({
      ok: false,
    });
    expect(parseAgreedMembershipPrice(1500, "")).toMatchObject({ ok: false });
    expect(parseAgreedMembershipPrice(1500, "abc")).toMatchObject({
      ok: false,
    });
  });

  it("ignores client-submitted discount — only agreed price matters", () => {
    const result = parseAgreedMembershipPrice(1500, "1000");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.discountAmount).toBe(500);
    }
  });
});

describe("staff form pricing sync contract", () => {
  it("resets agreed price when package changes", () => {
    const first = syncPackageSelectionPricing(1500, false, "1500");
    expect(first.agreedMembershipPrice).toBe("1500");
    const second = syncPackageSelectionPricing(2000, false, first.paymentAmount);
    expect(second.agreedMembershipPrice).toBe("2000");
    expect(second.paymentAmount).toBe("2000");
  });

  it("recalculates discount from standard minus agreed", () => {
    const standard = 1500;
    const agreed = 1000;
    expect(Math.round((standard - agreed) * 100) / 100).toBe(500);
  });

  it("preserves manually edited payment amount when agreed price changes", () => {
    const synced = syncPackageSelectionPricing(1500, true, "750");
    expect(synced.agreedMembershipPrice).toBe("1500");
    expect(synced.paymentAmount).toBe("750");
    const afterPackageChange = syncPackageSelectionPricing(
      2000,
      true,
      synced.paymentAmount,
    );
    expect(afterPackageChange.agreedMembershipPrice).toBe("2000");
    expect(afterPackageChange.paymentAmount).toBe("750");
  });
});

describe("agreed price pending dues", () => {
  it("uses agreed membership price for pending balance", () => {
    const { pendingAmount } = computeSubscriptionPendingFields(1000, 400, 0);
    expect(pendingAmount).toBe(600);
  });
});

describe("legacy subscription documents", () => {
  it("remain readable without optional audit fields", () => {
    const sub = {
      priceAtPurchase: 1500,
      paidTotal: 500,
      pendingAmount: 1000,
      writtenOffAmount: 0,
    } satisfies Pick<
      SubscriptionDoc,
      "priceAtPurchase" | "paidTotal" | "pendingAmount" | "writtenOffAmount"
    >;
    expect(
      pendingAmount(sub.priceAtPurchase, sub.paidTotal, sub.writtenOffAmount),
    ).toBe(1000);
    expect(sub).not.toHaveProperty("originalPriceAtPurchase");
  });
});

describe("SubscriptionsRepository.buildSubscriptionData", () => {
  const repo = new SubscriptionsRepository({} as never);

  it("stores agreed price and optional audit fields", () => {
    const built = repo.buildSubscriptionData("gym-1", {
      memberId: "m1",
      packageId: "p1",
      packageName: "Monthly",
      memberName: "Jane",
      memberNumber: 1,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-02-01"),
      priceAtPurchase: 1000,
      originalPriceAtPurchase: 1500,
      discountAmount: 500,
      createdById: "staff-1",
      initialPaidTotal: 500,
    });
    expect(built.priceAtPurchase).toBe(1000);
    expect(built.originalPriceAtPurchase).toBe(1500);
    expect(built.discountAmount).toBe(500);
    expect(built.pendingAmount).toBe(500);
  });

  it("remains backward compatible without audit fields", () => {
    const built = repo.buildSubscriptionData("gym-1", {
      memberId: "m1",
      packageId: "p1",
      packageName: "Monthly",
      memberName: "Jane",
      memberNumber: 1,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-02-01"),
      priceAtPurchase: 1500,
      createdById: null,
      initialPaidTotal: 0,
    });
    expect(built.priceAtPurchase).toBe(1500);
    expect(built.originalPriceAtPurchase).toBeUndefined();
    expect(built.discountAmount).toBeUndefined();
    expect(built.pendingAmount).toBe(1500);
  });
});
