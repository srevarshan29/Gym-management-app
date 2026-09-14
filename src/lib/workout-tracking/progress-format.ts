import type { ExerciseProgressPoint, ExerciseTrackingType } from "@/lib/workout-tracking/types";

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

/** Parse plan target reps like "15" or "8-12" into a numeric value for comparisons. */
export function parseTargetReps(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const numbers = value.match(/\d+/g)?.map(Number).filter(Number.isFinite);
  if (!numbers?.length) return null;
  return Math.max(...numbers);
}

export function progressPointValue(
  point: ExerciseProgressPoint,
  trackingType: ExerciseTrackingType,
): number | null {
  switch (trackingType) {
    case "TIME":
      return point.maxDurationSeconds;
    case "BODYWEIGHT":
    case "WEIGHTED":
      return point.maxWeightKg;
    default:
      return point.maxWeightKg;
  }
}

export function formatProgressValue(
  value: number,
  trackingType: ExerciseTrackingType,
): string {
  switch (trackingType) {
    case "TIME":
      return `${formatNumber(value)}s`;
    case "BODYWEIGHT":
      return `${formatNumber(value)} reps`;
    case "WEIGHTED":
      return `${formatNumber(value)} kg`;
    default:
      return formatNumber(value);
  }
}

export function progressMetricLabel(
  trackingType: ExerciseTrackingType,
  grouping: "weekly" | "monthly",
): string {
  const period = grouping === "weekly" ? "week" : "month";
  switch (trackingType) {
    case "TIME":
      return `Max duration per ${period}`;
    case "BODYWEIGHT":
      return `Max reps per ${period}`;
    case "WEIGHTED":
      return `Max weight per ${period}`;
    default:
      return `Max per ${period}`;
  }
}

export function progressChartValue(
  point: ExerciseProgressPoint,
  trackingType: ExerciseTrackingType,
): number {
  return progressPointValue(point, trackingType) ?? 0;
}

export function progressUsesIntegerAxis(
  trackingType: ExerciseTrackingType,
): boolean {
  return trackingType === "TIME" || trackingType === "BODYWEIGHT";
}
