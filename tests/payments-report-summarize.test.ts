import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import { PaymentsRepository } from "@/lib/firestore/repositories/payments";
import type { PaymentDoc } from "@/lib/firestore/types";
import type { DocWithId } from "@/lib/firestore/repositories/base";
import { platformContext } from "@/lib/firestore/helpers";

function paymentRow(
  overrides: Partial<PaymentDoc> & { id: string },
): DocWithId<PaymentDoc> {
  const { id, ...doc } = overrides;
  return {
    id,
    gymId: "gym-a",
    memberId: "m1",
    subscriptionId: null,
    amount: 100,
    method: "CASH",
    paidAt: Timestamp.fromDate(new Date("2026-09-10T12:00:00Z")),
    recordedById: "u1",
    note: null,
    createdAt: Timestamp.fromDate(new Date("2026-09-10T12:00:00Z")),
    ...doc,
  };
}

describe("PaymentsRepository.summarizePaidInRange", () => {
  it("builds metrics from iteratePaidInRange (no per-method aggregate queries)", async () => {
    const repo = new PaymentsRepository({} as never);
    const aggregateSpy = vi.spyOn(repo, "aggregatePaidInRangeForMethod");
    const iterateSpy = vi.spyOn(repo, "iteratePaidInRange");

    iterateSpy.mockImplementation(async function* () {
      yield paymentRow({ id: "p1", amount: 200, method: "CASH" });
      yield paymentRow({ id: "p2", amount: 300, method: "UPI" });
    });

    const start = new Date("2026-09-01T00:00:00Z");
    const end = new Date("2026-10-01T00:00:00Z");
    const metrics = await repo.summarizePaidInRange(
      platformContext,
      "gym-a",
      start,
      end,
    );

    expect(aggregateSpy).not.toHaveBeenCalled();
    expect(metrics.paymentCount).toBe(2);
    expect(metrics.totalCollected).toBe(500);
    expect(metrics.byMethod).toEqual(
      expect.arrayContaining([
        { method: "CASH", count: 1, total: 200 },
        { method: "UPI", count: 1, total: 300 },
      ]),
    );

    aggregateSpy.mockRestore();
    iterateSpy.mockRestore();
  });
});
