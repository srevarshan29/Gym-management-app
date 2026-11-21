export type WeightJourneyDirection = "loss" | "gain";

export function assertValidWeightKg(weightKg: number): number {
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) {
    throw new Error("Enter a valid weight between 20 and 500 kg.");
  }
  return Math.round(weightKg * 10) / 10;
}

export function weightJourneyDirection(
  startKg: number,
  targetKg: number,
): WeightJourneyDirection {
  return targetKg < startKg ? "loss" : "gain";
}

/** Progress 0–100 clamped; allows moving backward when current weight fluctuates. */
export function computeWeightJourneyProgressPercent(
  startKg: number,
  currentKg: number,
  targetKg: number,
): number {
  if (
    !Number.isFinite(startKg) ||
    !Number.isFinite(currentKg) ||
    !Number.isFinite(targetKg)
  ) {
    return 0;
  }

  const epsilon = 0.001;
  if (Math.abs(startKg - targetKg) < epsilon) {
    return Math.abs(currentKg - targetKg) < epsilon ? 100 : 0;
  }

  let ratio: number;
  if (targetKg < startKg) {
    const total = startKg - targetKg;
    const moved = startKg - currentKg;
    ratio = moved / total;
  } else {
    const total = targetKg - startKg;
    const moved = currentKg - startKg;
    ratio = moved / total;
  }

  if (!Number.isFinite(ratio)) return 0;
  return Math.min(100, Math.max(0, ratio * 100));
}

export type WeightJourneyDerived = {
  startingWeightKg: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  progressPercent: number;
  direction: WeightJourneyDirection | null;
  hasMeasurements: boolean;
  /** True when trailhead comes from member dashboard state, not earliest log. */
  startingWeightIsCustom: boolean;
};

export function deriveWeightJourney(
  measurements: { weightKg: number; recordedAtMs: number }[],
  targetKg: number | null,
  startKgOverride?: number | null,
): WeightJourneyDerived {
  const sorted =
    measurements.length === 0
      ? []
      : [...measurements].sort((a, b) => a.recordedAtMs - b.recordedAtMs);
  const firstLogKg = sorted.length > 0 ? sorted[0]!.weightKg : null;
  const current =
    sorted.length > 0 ? sorted[sorted.length - 1]!.weightKg : null;
  const start =
    startKgOverride != null ? startKgOverride : firstLogKg;
  const startingWeightIsCustom = startKgOverride != null;

  if (start == null && current == null) {
    return {
      startingWeightKg: null,
      currentWeightKg: null,
      targetWeightKg: targetKg,
      progressPercent: 0,
      direction: null,
      hasMeasurements: measurements.length > 0,
      startingWeightIsCustom,
    };
  }

  const direction =
    start != null && targetKg != null
      ? weightJourneyDirection(start, targetKg)
      : null;
  const progressPercent =
    start != null && current != null && targetKg != null
      ? computeWeightJourneyProgressPercent(start, current, targetKg)
      : 0;

  return {
    startingWeightKg: start,
    currentWeightKg: current,
    targetWeightKg: targetKg,
    progressPercent,
    direction,
    hasMeasurements: measurements.length > 0,
    startingWeightIsCustom,
  };
}
