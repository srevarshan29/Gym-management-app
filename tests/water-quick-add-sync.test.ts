import { describe, expect, it } from "vitest";

import {
  dropFailedWaterWrite,
  enqueueWaterQuickAdd,
  mergeConfirmedWaterMl,
  reconcileWaterAfterServerSuccess,
  sumPendingWaterMl,
  waterProgressWithPending,
  type WaterQuickAddOperation,
} from "@/lib/water/water-quick-add-sync";
import { MEMBER_WATER_QUICK_ADD_ML } from "@/lib/water/water-progress";

function op(id: string, amountMl = MEMBER_WATER_QUICK_ADD_ML): WaterQuickAddOperation {
  return { operationId: id, amountMl };
}

describe("water quick-add sync", () => {
  it("shows optimistic total for queued taps before server confirms", () => {
    let confirmed = 500;
    let pending: WaterQuickAddOperation[] = [];

    pending = enqueueWaterQuickAdd(pending, MEMBER_WATER_QUICK_ADD_ML, "op-1");
    pending = enqueueWaterQuickAdd(pending, MEMBER_WATER_QUICK_ADD_ML, "op-2");
    pending = enqueueWaterQuickAdd(pending, MEMBER_WATER_QUICK_ADD_ML, "op-3");

    expect(sumPendingWaterMl(pending)).toBe(750);
    expect(waterProgressWithPending(confirmed, pending).consumedMl).toBe(1250);

    const first = reconcileWaterAfterServerSuccess(750, pending, confirmed);
    confirmed = first.confirmedConsumedMl;
    pending = first.pending;
    expect(waterProgressWithPending(confirmed, pending).consumedMl).toBe(1250);

    const second = reconcileWaterAfterServerSuccess(1000, pending, confirmed);
    confirmed = second.confirmedConsumedMl;
    pending = second.pending;
    expect(waterProgressWithPending(confirmed, pending).consumedMl).toBe(1250);

    const third = reconcileWaterAfterServerSuccess(1250, pending, confirmed);
    confirmed = third.confirmedConsumedMl;
    pending = third.pending;
    expect(waterProgressWithPending(confirmed, pending).consumedMl).toBe(1250);
    expect(pending).toEqual([]);
  });

  it("does not roll back newer optimistic taps when an older write fails", () => {
    const confirmed = 500;
    const pending = [op("a"), op("b"), op("c")];
    const afterFailure = dropFailedWaterWrite(pending);
    expect(waterProgressWithPending(confirmed, afterFailure).consumedMl).toBe(
      1000,
    );
    expect(afterFailure.map((item) => item.operationId)).toEqual(["b", "c"]);
  });

  it("marks goal complete from optimistic display", () => {
    const progress = waterProgressWithPending(2900, [op("goal")]);
    expect(progress.goalComplete).toBe(true);
    expect(progress.consumedMl).toBe(3150);
  });

  it("retries preserve later queued taps in the displayed total", () => {
    const confirmed = 0;
    const pending = [op("one"), op("two")];
    const failedOnce = dropFailedWaterWrite(pending);
    expect(waterProgressWithPending(confirmed, failedOnce).consumedMl).toBe(250);
    const reconciled = reconcileWaterAfterServerSuccess(250, failedOnce, confirmed);
    expect(
      waterProgressWithPending(
        reconciled.confirmedConsumedMl,
        reconciled.pending,
      ).consumedMl,
    ).toBe(250);
  });

  it("does not roll back confirmed total when dashboard props or server lag behind", () => {
    expect(mergeConfirmedWaterMl(750, 500)).toBe(750);
    expect(mergeConfirmedWaterMl(500, 750)).toBe(750);

    const reconciled = reconcileWaterAfterServerSuccess(500, [], 750);
    expect(reconciled.confirmedConsumedMl).toBe(750);
    expect(waterProgressWithPending(reconciled.confirmedConsumedMl, []).consumedMl).toBe(
      750,
    );
  });
});
