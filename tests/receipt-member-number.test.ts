import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import type { BillingTransaction } from "@/lib/firestore/billing-transaction";
import {
  ReceiptsRepository,
  resolveReceiptMemberNumber,
} from "@/lib/firestore/repositories/receipts";
import type { MemberDoc, PaymentDoc } from "@/lib/firestore/types";
import {
  formatMemberNumber,
  receiptMemberDisplayId,
} from "@/lib/receipt-display";

describe("formatMemberNumber", () => {
  it("formats member numbers with a hash and four-digit padding", () => {
    expect(formatMemberNumber(1)).toBe("#0001");
    expect(formatMemberNumber(78)).toBe("#0078");
  });

  it("builds receipt member display id from snapshot or em dash", () => {
    expect(receiptMemberDisplayId(78)).toBe("#0078");
    expect(receiptMemberDisplayId(null)).toBe("\u2014");
    expect(receiptMemberDisplayId(undefined)).toBe("\u2014");
  });
});

describe("resolveReceiptMemberNumber", () => {
  it("returns stored memberNumber without a member lookup", async () => {
    const get = vi.fn();
    const db = {
      collection: () => ({ doc: () => ({ get }) }),
    };

    const result = await resolveReceiptMemberNumber(
      db as never,
      "gym-1",
      { memberId: "doc-id", memberNumber: 8 },
    );

    expect(result).toBe(8);
    expect(get).not.toHaveBeenCalled();
  });

  it("loads memberNumber from the member doc when the receipt snapshot is missing", async () => {
    const get = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ gymId: "gym-1", memberNumber: 49 }),
    });
    const db = {
      collection: (name: string) => ({
        doc: (id: string) => {
          expect(name).toBe("members");
          expect(id).toBe("legacy-doc-id");
          return { get };
        },
      }),
    };

    const result = await resolveReceiptMemberNumber(
      db as never,
      "gym-1",
      { memberId: "legacy-doc-id" },
    );

    expect(result).toBe(49);
  });

  it("returns null when the member cannot be resolved", async () => {
    const get = vi.fn().mockResolvedValue({ exists: false });
    const db = {
      collection: () => ({ doc: () => ({ get }) }),
    };

    const result = await resolveReceiptMemberNumber(
      db as never,
      "gym-1",
      { memberId: "missing" },
    );

    expect(result).toBeNull();
  });
});

describe("ReceiptsRepository.createForPaymentInTransaction", () => {
  it("stores memberNumber from the member record on new receipts", () => {
    const repo = new ReceiptsRepository({} as never);
    const btx = { gymId: "gym-1" } as BillingTransaction;
    const now = Timestamp.now();

    const payment: PaymentDoc & { id: string } = {
      id: "pay-1",
      gymId: "gym-1",
      memberId: "84b6562ba87a4df79044567b5",
      subscriptionId: null,
      amount: 500,
      method: "CASH",
      paidAt: now,
      note: null,
      recordedById: "staff-1",
      createdAt: now,
    };

    const member = {
      gymId: "gym-1",
      memberNumber: 78,
      name: "Priya",
      phone: "9999999999",
      email: null,
    } as MemberDoc;

    const built = repo.createForPaymentInTransaction(btx, {
      payment,
      member,
      subscription: null,
      paidTotalForSubscription: null,
      gymProfile: {
        name: "Iron Gym",
        address: null,
        phone: null,
        logoUrl: null,
      },
    });

    expect(built.memberNumber).toBe(78);
    expect(built.memberId).toBe("84b6562ba87a4df79044567b5");
  });
});
