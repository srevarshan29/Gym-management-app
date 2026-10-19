import type { WorkoutSessionDoc } from "@/lib/firestore/types";

/** Count sets persisted on a session (any exercise). */
export function countLoggedSetsInSession(
  session: Pick<WorkoutSessionDoc, "exercises">,
): number {
  let total = 0;
  for (const exercise of session.exercises) {
    total += exercise.sets?.length ?? 0;
  }
  return total;
}
