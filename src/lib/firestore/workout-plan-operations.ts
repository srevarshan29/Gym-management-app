import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirestoreDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { newDocId, platformContext } from "@/lib/firestore/helpers";
import { getRepositories } from "@/lib/firestore";
import type { UpsertWorkoutPlanInput } from "@/lib/firestore/repositories/workout-plans";
import type {
  WorkoutPlanDayEmbedded,
  WorkoutPlanExerciseEmbedded,
} from "@/lib/firestore/types";

export type NormalizedPlanDayInput = {
  label: string;
  sortOrder: number;
  exercises: {
    exerciseId: string | null;
    customName: string | null;
    sortOrder: number;
    targetSets: number;
    targetReps: string;
    tempo: string | null;
    restSeconds: number | null;
    targetWeightKg: number | null;
  }[];
};

export function buildEmbeddedPlanDays(
  days: NormalizedPlanDayInput[],
): WorkoutPlanDayEmbedded[] {
  return days.map((day) => ({
    id: newDocId(),
    label: day.label,
    sortOrder: day.sortOrder,
    exercises: day.exercises.map(
      (row): WorkoutPlanExerciseEmbedded => ({
        id: newDocId(),
        exerciseId: row.exerciseId,
        customName: row.customName,
        sortOrder: row.sortOrder,
        targetSets: row.targetSets,
        targetReps: row.targetReps,
        tempo: row.tempo,
        restSeconds: row.restSeconds,
        targetWeightKg: row.targetWeightKg,
        trackingTypeOverride: null,
      }),
    ),
  }));
}

export async function saveWorkoutPlanRecord(
  gymId: string,
  input: UpsertWorkoutPlanInput,
): Promise<string> {
  const db = getFirestoreDb();
  const { workoutPlans } = getRepositories();
  const existing = await workoutPlans.findByMemberId(
    platformContext,
    gymId,
    input.memberId,
  );
  const draftId = newDocId();

  return db.runTransaction(async (tx) => {
    const planId = await workoutPlans.savePlanInTransaction(
      tx,
      platformContext,
      gymId,
      draftId,
      input,
      existing,
    );

    if (!existing) {
      tx.update(db.collection(COLLECTIONS.gyms).doc(gymId), {
        "dashboardCounters.workoutPlanCount": FieldValue.increment(1),
        "dashboardCounters.countersUpdatedAt": Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    return planId;
  });
}

export async function deleteWorkoutPlanRecord(
  gymId: string,
  planId: string,
): Promise<boolean> {
  const db = getFirestoreDb();
  const { workoutPlans, workoutSessions } = getRepositories();

  const plan = await workoutPlans.getById(platformContext, gymId, planId);
  if (!plan) return false;

  await workoutSessions.deleteByWorkoutPlanId(platformContext, gymId, planId);

  await db.runTransaction(async (tx) => {
    tx.delete(db.collection(COLLECTIONS.workoutPlans).doc(planId));
    tx.update(db.collection(COLLECTIONS.gyms).doc(gymId), {
      "dashboardCounters.workoutPlanCount": FieldValue.increment(-1),
      "dashboardCounters.countersUpdatedAt": Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  return true;
}

export async function deleteWorkoutPlanForMember(
  gymId: string,
  memberId: string,
): Promise<boolean> {
  const { workoutPlans } = getRepositories();
  const doc = await workoutPlans.findByMemberId(platformContext, gymId, memberId);
  if (!doc) return false;
  return deleteWorkoutPlanRecord(gymId, doc.id);
}
