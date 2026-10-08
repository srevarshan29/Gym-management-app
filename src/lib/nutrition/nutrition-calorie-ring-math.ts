/** Progress fill for the daily calorie ring (0–100), or null when no valid target. */
export function nutritionCalorieRingProgress(
  calories: number,
  targetCalories: number | null,
): { displayCalories: number; displayTarget: number | null; percent: number } {
  const displayCalories = Number.isFinite(calories)
    ? Math.max(0, Math.round(calories))
    : 0;
  const displayTarget =
    targetCalories != null &&
    Number.isFinite(targetCalories) &&
    targetCalories > 0
      ? Math.round(targetCalories)
      : null;

  const percent =
    displayTarget == null
      ? 0
      : Math.min(100, Math.max(0, (displayCalories / displayTarget) * 100));

  return { displayCalories, displayTarget, percent };
}
