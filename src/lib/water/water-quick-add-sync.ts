import {
  waterDayProgress,
  type WaterDayProgress,
} from "@/lib/water/water-progress";

export type WaterQuickAddOperation = {
  operationId: string;
  amountMl: number;
};

export function sumPendingWaterMl(
  pending: readonly WaterQuickAddOperation[],
): number {
  return pending.reduce((sum, op) => sum + op.amountMl, 0);
}

/** Displayed total = last server-confirmed total plus not-yet-persisted quick adds. */
export function waterProgressWithPending(
  confirmedConsumedMl: number,
  pending: readonly WaterQuickAddOperation[],
  targetMl?: number,
): WaterDayProgress {
  return waterDayProgress(
    confirmedConsumedMl + sumPendingWaterMl(pending),
    targetMl,
  );
}

export function enqueueWaterQuickAdd(
  pending: readonly WaterQuickAddOperation[],
  amountMl: number,
  operationId: string,
): WaterQuickAddOperation[] {
  return [...pending, { operationId, amountMl }];
}

/** Never roll back a higher on-device confirmed total (stale RSC props or lagging writes). */
export function mergeConfirmedWaterMl(
  currentConfirmedMl: number,
  nextConsumedMl: number,
): number {
  const current = Number.isFinite(currentConfirmedMl)
    ? Math.max(0, Math.round(currentConfirmedMl))
    : 0;
  const next = Number.isFinite(nextConsumedMl)
    ? Math.max(0, Math.round(nextConsumedMl))
    : current;
  return Math.max(current, next);
}

/** After a successful write for the head of the queue, trust server total and dequeue one. */
export function reconcileWaterAfterServerSuccess(
  serverConsumedMl: number,
  pending: readonly WaterQuickAddOperation[],
  currentConfirmedMl: number,
): { confirmedConsumedMl: number; pending: WaterQuickAddOperation[] } {
  return {
    confirmedConsumedMl: mergeConfirmedWaterMl(
      currentConfirmedMl,
      serverConsumedMl,
    ),
    pending: pending.slice(1),
  };
}

/** Drop a failed head item so the UI and queue stay aligned (tap not persisted). */
export function dropFailedWaterWrite(
  pending: readonly WaterQuickAddOperation[],
): WaterQuickAddOperation[] {
  return pending.slice(1);
}
