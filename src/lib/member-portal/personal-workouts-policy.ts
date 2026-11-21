import type { MemberPlanFilter } from "@/lib/member-portal/member-workout-tab-url";
import type { MemberDoc } from "@/lib/firestore/types";

export const PERSONAL_WORKOUTS_LOCKED_MESSAGE =
  "Ask your gym admin to unlock personal workouts.";

export class PersonalWorkoutsAccessError extends Error {
  constructor(message = PERSONAL_WORKOUTS_LOCKED_MESSAGE) {
    super(message);
    this.name = "PersonalWorkoutsAccessError";
  }
}

/** Missing field or explicit false → locked (no migration required). */
export function isPersonalWorkoutsEnabled(
  member: Pick<MemberDoc, "personalWorkoutsEnabled"> | null | undefined,
): boolean {
  return member?.personalWorkoutsEnabled === true;
}

export function assertPersonalWorkoutsEnabled(
  member: Pick<MemberDoc, "personalWorkoutsEnabled"> | null | undefined,
): void {
  if (!isPersonalWorkoutsEnabled(member)) {
    throw new PersonalWorkoutsAccessError();
  }
}

/** Personal workout list/editor is hidden under All/Mine when access is locked. */
export function memberPlanShowsPersonalWorkouts(
  planFilter: MemberPlanFilter,
  personalWorkoutsEnabled: boolean,
): boolean {
  return (
    personalWorkoutsEnabled &&
    (planFilter === "all" || planFilter === "mine")
  );
}
