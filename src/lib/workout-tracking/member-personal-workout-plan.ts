import { Timestamp } from "firebase-admin/firestore";

import type { DocWithId } from "@/lib/firestore/repositories/base";
import type {
  MemberPersonalWorkoutDoc,
  MemberPersonalWorkoutExerciseEmbedded,
  WorkoutPlanDayEmbedded,
  WorkoutPlanDoc,
  WorkoutPlanExerciseEmbedded,
} from "@/lib/firestore/types";
import { memberCatalogExerciseId } from "@/lib/workout-tracking/member-catalog-exercises";
import { newDocId } from "@/lib/firestore/helpers";

export const PERSONAL_WORKOUT_DAY_ID = "personal-day";

export function reorderPersonalWorkoutExercises(
  exercises: MemberPersonalWorkoutExerciseEmbedded[],
  orderedIds: string[],
): MemberPersonalWorkoutExerciseEmbedded[] {
  const byId = new Map(exercises.map((row) => [row.id, row]));
  const ordered: MemberPersonalWorkoutExerciseEmbedded[] = [];
  orderedIds.forEach((id, index) => {
    const row = byId.get(id);
    if (!row) return;
    ordered.push({ ...row, sortOrder: index });
  });
  for (const row of exercises) {
    if (!orderedIds.includes(row.id)) {
      ordered.push({ ...row, sortOrder: ordered.length });
    }
  }
  return ordered;
}

export function removePersonalWorkoutExercise(
  exercises: MemberPersonalWorkoutExerciseEmbedded[],
  exerciseRowId: string,
): MemberPersonalWorkoutExerciseEmbedded[] {
  return exercises
    .filter((row) => row.id !== exerciseRowId)
    .map((row, index) => ({ ...row, sortOrder: index }));
}

export function appendPersonalWorkoutExercise(
  exercises: MemberPersonalWorkoutExerciseEmbedded[],
  catalogId: string,
  defaults?: { targetSets?: number; targetReps?: string },
): MemberPersonalWorkoutExerciseEmbedded[] {
  const next: MemberPersonalWorkoutExerciseEmbedded = {
    id: newDocId(),
    catalogId: catalogId.trim(),
    sortOrder: exercises.length,
    targetSets: defaults?.targetSets ?? 3,
    targetReps: defaults?.targetReps ?? "10",
  };
  return [...exercises, next];
}

function personalExerciseToPlanRow(
  row: MemberPersonalWorkoutExerciseEmbedded,
): WorkoutPlanExerciseEmbedded {
  return {
    id: row.id,
    exerciseId: memberCatalogExerciseId(row.catalogId),
    customName: null,
    sortOrder: row.sortOrder,
    targetSets: row.targetSets,
    targetReps: row.targetReps,
    tempo: null,
    restSeconds: 90,
    targetWeightKg: null,
    trackingTypeOverride: null,
  };
}

export function personalWorkoutToPlanDoc(
  personal: DocWithId<MemberPersonalWorkoutDoc>,
): DocWithId<WorkoutPlanDoc> {
  const sorted = [...personal.exercises].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const day: WorkoutPlanDayEmbedded = {
    id: PERSONAL_WORKOUT_DAY_ID,
    label: personal.name,
    sortOrder: 0,
    exercises: sorted.map(personalExerciseToPlanRow),
  };
  const now = Timestamp.now();
  return {
    id: personal.id,
    gymId: personal.gymId,
    memberId: personal.memberId,
    memberName: "",
    title: personal.name,
    durationWeeks: null,
    focusGoal: null,
    level: null,
    weeklySchedule: null,
    days: [day],
    createdAt: personal.createdAt,
    updatedAt: personal.updatedAt,
  };
}

export function isPersonalWorkoutSession(
  session: Pick<
    import("@/lib/firestore/types").WorkoutSessionDoc,
    "sessionKind" | "personalWorkoutId"
  >,
): boolean {
  return (
    session.sessionKind === "PERSONAL" &&
    Boolean(session.personalWorkoutId?.trim())
  );
}
