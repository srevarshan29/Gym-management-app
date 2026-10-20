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

const start = new Date("2026-09-01T00:00:00Z");
const end = new Date("2026-10-01T00:00:00Z");

describe("PaymentsRepository.summarizePaidInRange", () => {
  it("uses aggregates for count, total, and per-method breakdown when indexes exist", async () => {
    const repo = new PaymentsRepository({} as never);
    vi.spyOn(repo, "countPaidInRange").mockResolvedValue(2);
    vi.spyOn(repo, "sumPaidInRange").mockResolvedValue(500);
    vi.spyOn(repo, "aggregatePaidInRangeForMethod").mockImplementation(
      async (_ctx, _gymId, _start, _end, method) => {
        if (method === "CASH") return { method, count: 1, total: 200 };
        if (method === "UPI") return { method, count: 1, total: 300 };
        return { method, count: 0, total: 0 };
      },
    );
    const iterateSpy = vi.spyOn(repo, "iteratePaidInRange");

    const metrics = await repo.summarizePaidInRange(
      platformContext,
      "gym-a",
      start,
      end,
    );

    expect(iterateSpy).not.toHaveBeenCalled();
    expect(metrics.paymentCount).toBe(2);
    expect(metrics.totalCollected).toBe(500);
    expect(metrics.byMethod).toEqual(
      expect.arrayContaining([
        { method: "CASH", count: 1, total: 200 },
        { method: "UPI", count: 1, total: 300 },
      ]),
    );
  });

  it("returns zero metrics without per-method queries when count is zero", async () => {
    const repo = new PaymentsRepository({} as never);
    vi.spyOn(repo, "countPaidInRange").mockResolvedValue(0);
    const sumSpy = vi.spyOn(repo, "sumPaidInRange");
    const methodSpy = vi.spyOn(repo, "aggregatePaidInRangeForMethod");

    const metrics = await repo.summarizePaidInRange(
      platformContext,
      "gym-a",
      start,
      end,
    );

    expect(metrics).toEqual({
      totalCollected: 0,
      paymentCount: 0,
      averagePayment: 0,
      byMethod: [],
    });
    expect(sumSpy).not.toHaveBeenCalled();
    expect(methodSpy).not.toHaveBeenCalled();
  });

  it("falls back to range iteration when per-method aggregates lack an index", async () => {
    const repo = new PaymentsRepository({} as never);
    vi.spyOn(repo, "countPaidInRange").mockResolvedValue(2);
    vi.spyOn(repo, "sumPaidInRange").mockResolvedValue(500);
    vi.spyOn(repo, "aggregatePaidInRangeForMethod").mockRejectedValue({
      code: 9,
      message: "index required",
    });
    const iterateSpy = vi.spyOn(repo, "iteratePaidInRange").mockImplementation(
      async function* () {
        yield paymentRow({ id: "p1", amount: 200, method: "CASH" });
        yield paymentRow({ id: "p2", amount: 300, method: "UPI" });
      },
    );

    const metrics = await repo.summarizePaidInRange(
      platformContext,
      "gym-a",
      start,
      end,
    );

    expect(iterateSpy).toHaveBeenCalled();
    expect(metrics.paymentCount).toBe(2);
    expect(metrics.totalCollected).toBe(500);
  });
});
