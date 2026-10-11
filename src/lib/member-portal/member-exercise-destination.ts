import type { MemberPersonalWorkoutSummary } from "@/lib/workout-tracking/member-personal-workouts";

export function personalWorkoutContainsCatalog(
  workout: Pick<MemberPersonalWorkoutSummary, "catalogIds">,
  catalogId: string,
): boolean {
  const id = catalogId.trim();
  if (!id) return false;
  return workout.catalogIds.includes(id);
}

export function pickDefaultPersonalWorkoutId(
  workouts: MemberPersonalWorkoutSummary[],
  preferredId?: string | null,
): string {
  const preferred = preferredId?.trim();
  if (preferred && workouts.some((w) => w.id === preferred)) {
    return preferred;
  }
  return workouts[0]?.id ?? "";
}

export function selectedPersonalWorkout(
  workouts: MemberPersonalWorkoutSummary[],
  selectedId: string,
): MemberPersonalWorkoutSummary | null {
  const id = selectedId.trim();
  if (!id) return null;
  return workouts.find((w) => w.id === id) ?? null;
}
