export const DEFAULT_MEMBER_WATER_TARGET_ML = 3000;
export const MEMBER_WATER_QUICK_ADD_ML = 250;

export type WaterDayProgress = {
  consumedMl: number;
  targetMl: number;
  percent: number;
  goalComplete: boolean;
};

export function sumWaterLogMl(
  entries: { amountMl: number }[],
): number {
  return entries.reduce(
    (sum, row) =>
      sum + (Number.isFinite(row.amountMl) ? Math.max(0, row.amountMl) : 0),
    0,
  );
}

export function waterDayProgress(
  consumedMl: number,
  targetMl: number = DEFAULT_MEMBER_WATER_TARGET_ML,
): WaterDayProgress {
  const safeTarget =
    Number.isFinite(targetMl) && targetMl > 0
      ? Math.round(targetMl)
      : DEFAULT_MEMBER_WATER_TARGET_ML;
  const consumed = Number.isFinite(consumedMl)
    ? Math.max(0, Math.round(consumedMl))
    : 0;
  const percent = Math.min(100, Math.max(0, (consumed / safeTarget) * 100));
  return {
    consumedMl: consumed,
    targetMl: safeTarget,
    percent,
    goalComplete: consumed >= safeTarget,
  };
}

export function formatWaterLiters(ml: number): string {
  const safe = Math.max(0, ml);
  if (safe >= 1000) {
    const liters = safe / 1000;
    const rounded =
      liters >= 10 ? Math.round(liters) : Math.round(liters * 10) / 10;
    return `${rounded} L`;
  }
  return `${Math.round(safe)} ml`;
}

export function formatWaterRemainingMl(remainingMl: number): string {
  const remaining = Math.max(0, Math.round(remainingMl));
  if (remaining >= 1000) {
    return `${formatWaterLiters(remaining)} to go`;
  }
  return `${remaining} ml to go`;
}
