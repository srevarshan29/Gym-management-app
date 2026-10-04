import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { findRecentDuplicatePaymentId } from "@/lib/firestore/billing/operations";
import type { LogPaymentBillingInput } from "@/lib/firestore/billing/operations";

describe("findRecentDuplicatePaymentId", () => {
  const get = vi.fn();
  const limit = vi.fn();
  const where = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    where.mockReturnValue({ where, limit, get });
    limit.mockReturnValue({ get });
    get.mockResolvedValue({ empty: true, docs: [] });
  });

  function db() {
    return {
      collection: () => ({ where }),
    } as never;
  }

  const baseInput: LogPaymentBillingInput = {
    gymId: "gym-a",
    memberId: "member-1",
    subscriptionId: "sub-a",
    amount: 1000,
    method: "CASH",
    paidAt: new Date("2026-10-04T10:00:00.000Z"),
    note: null,
    recordedById: "staff-1",
  };

  it("scopes duplicate detection by gymId and subscriptionId", async () => {
    await findRecentDuplicatePaymentId(db(), baseInput);

    expect(where).toHaveBeenCalledWith("gymId", "==", "gym-a");
    expect(where).toHaveBeenCalledWith("memberId", "==", "member-1");
    expect(where).toHaveBeenCalledWith("subscriptionId", "==", "sub-a");
    expect(where).toHaveBeenCalledWith("amount", "==", 1000);
    expect(where).toHaveBeenCalledWith("method", "==", "CASH");
    expect(where).toHaveBeenCalledWith(
      "paidAt",
      ">=",
      Timestamp.fromDate(new Date(baseInput.paidAt.getTime() - 60_000)),
    );
  });

  it("treats missing subscriptionId as null for duplicate matching", async () => {
    await findRecentDuplicatePaymentId(db(), {
      ...baseInput,
      subscriptionId: null,
    });

    expect(where).toHaveBeenCalledWith("subscriptionId", "==", null);
  });

  it("returns an existing payment id when a duplicate is found", async () => {
    get.mockResolvedValueOnce({
      empty: false,
      docs: [{ id: "pay-dup" }],
    });

    const id = await findRecentDuplicatePaymentId(db(), baseInput);
    expect(id).toBe("pay-dup");
  });
});
