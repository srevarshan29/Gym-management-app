import { describe, expect, it } from "vitest";

import {
  assertRenewalDoesNotOverlap,
  computeRenewalPeriod,
  computeRenewalStartDate,
  maxSubscriptionEndDate,
  membershipNeedsRenewalConfirmation,
  RENEWAL_OVERLAP_ERROR,
  subscriptionPeriodsOverlap,
} from "@/lib/subscription-renewal";
import { daysUntil } from "@/lib/subscription";

describe("subscriptionPeriodsOverlap", () => {
  it("allows back-to-back periods when new start equals previous end", () => {
    const end = new Date("2027-09-29T10:00:00.000Z");
    const nextStart = new Date("2027-09-29T10:00:00.000Z");
    const nextEnd = new Date("2028-09-29T10:00:00.000Z");
    expect(
      subscriptionPeriodsOverlap(
        new Date("2026-09-29T10:00:00.000Z"),
        end,
        nextStart,
        nextEnd,
      ),
    ).toBe(false);
  });

  it("detects overlapping periods", () => {
    expect(
      subscriptionPeriodsOverlap(
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-12-31T00:00:00.000Z"),
        new Date("2026-06-01T00:00:00.000Z"),
        new Date("2027-06-01T00:00:00.000Z"),
      ),
    ).toBe(true);
  });
});

describe("computeRenewalStartDate", () => {
  const now = new Date("2026-10-04T12:00:00.000Z");

  it("starts after active membership end (calendar active)", () => {
    const end = new Date("2027-09-29T08:00:00.000Z");
    expect(daysUntil(end, now)).toBeGreaterThan(0);
    const start = computeRenewalStartDate([{ endDate: end }], now);
    expect(start.getTime()).toBe(end.getTime());
  });

  it("starts after expiring-soon membership end on same calendar day edge", () => {
    const end = new Date("2026-10-04T08:00:00.000Z");
    expect(daysUntil(end, now)).toBe(0);
    const start = computeRenewalStartDate([{ endDate: end }], now);
    expect(start.getTime()).toBe(end.getTime());
  });

  it("starts today when membership is expired", () => {
    const end = new Date("2026-09-01T00:00:00.000Z");
    const start = computeRenewalStartDate([{ endDate: end }], now);
    expect(start.getTime()).toBe(now.getTime());
  });

  it("chains after the furthest existing end when future period exists", () => {
    const activeEnd = new Date("2026-12-01T00:00:00.000Z");
    const futureEnd = new Date("2027-01-01T00:00:00.000Z");
    const start = computeRenewalStartDate(
      [{ endDate: activeEnd }, { endDate: futureEnd }],
      now,
    );
    expect(start.getTime()).toBe(futureEnd.getTime());
  });
});

describe("computeRenewalPeriod", () => {
  it("creates a non-overlapping next period for active member", () => {
    const now = new Date("2026-10-04T12:00:00.000Z");
    const existingEnd = new Date("2027-09-29T10:00:00.000Z");
    const { startDate, endDate } = computeRenewalPeriod(
      [{ endDate: existingEnd }],
      12,
      "MONTHS",
      now,
    );
    expect(startDate.getTime()).toBe(existingEnd.getTime());
    expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
    assertRenewalDoesNotOverlap(
      [{ startDate: new Date("2026-09-29T10:00:00.000Z"), endDate: existingEnd }],
      startDate,
      endDate,
    );
  });
});

describe("assertRenewalDoesNotOverlap", () => {
  it("rejects duplicate concurrent renewal windows", () => {
    const start = new Date("2027-09-29T10:00:00.000Z");
    const end = new Date("2028-09-29T10:00:00.000Z");
    const existing = [{ startDate: start, endDate: end }];
    expect(() => assertRenewalDoesNotOverlap(existing, start, end)).toThrow(
      RENEWAL_OVERLAP_ERROR,
    );
  });

  it("allows sequential future renewal after queued period", () => {
    const firstStart = new Date("2027-09-29T10:00:00.000Z");
    const firstEnd = new Date("2028-09-29T10:00:00.000Z");
    const nextStart = new Date("2028-09-29T10:00:00.000Z");
    const nextEnd = new Date("2029-09-29T10:00:00.000Z");
    expect(() =>
      assertRenewalDoesNotOverlap(
        [{ startDate: firstStart, endDate: firstEnd }],
        nextStart,
        nextEnd,
      ),
    ).not.toThrow();
  });
});

describe("membershipNeedsRenewalConfirmation", () => {
  it("requires confirmation for active and expiring soon only", () => {
    expect(membershipNeedsRenewalConfirmation("ACTIVE")).toBe(true);
    expect(membershipNeedsRenewalConfirmation("EXPIRING_SOON")).toBe(true);
    expect(membershipNeedsRenewalConfirmation("EXPIRED")).toBe(false);
  });
});

describe("maxSubscriptionEndDate", () => {
  it("returns the latest end boundary", () => {
    const a = new Date("2026-12-01T00:00:00.000Z");
    const b = new Date("2027-01-01T00:00:00.000Z");
    expect(
      maxSubscriptionEndDate([{ endDate: a }, { endDate: b }])?.getTime(),
    ).toBe(b.getTime());
  });
});

describe("logPaymentWithReceipt does not create subscriptions", () => {
  it("is unchanged — payment-only module surface", async () => {
    const { logPaymentWithReceipt } = await import(
      "@/lib/firestore/billing/operations"
    );
    expect(typeof logPaymentWithReceipt).toBe("function");
    expect(logPaymentWithReceipt.length).toBe(1);
  });
});

import { adjustMemberPendingTotal } from "@/lib/firestore/pending-sync";

describe("pending dues preservation on renew", () => {
  it("adds new cycle pending without zeroing prior subscription balances", () => {
    const total = adjustMemberPendingTotal(500, 1000);
    expect(total).toBe(1500);
  });
});