import type { SuggestedWorkoutDay } from "@/lib/workout-tracking/types";

/** Matches dashboard motivational message "workout completed today" signal. */
export function isWorkoutCompletedTodaySuggestion(
  suggestion: SuggestedWorkoutDay,
): boolean {
  return suggestion.kind === "completed_today";
}
