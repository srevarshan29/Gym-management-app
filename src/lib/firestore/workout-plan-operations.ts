import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirestoreDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firestore/collections";
import { newDocId, platformContext } from "@/lib/firestore/helpers";
import { getRepositories } from "@/lib/firestore";
import type { UpsertWorkoutPlanInput } from "@/lib/firestore/repositories/workout-plans";
import type {
  WorkoutPlanDayEmbedded,
  WorkoutPlanDoc,
  WorkoutPlanExerciseEmbedded,
} from "@/lib/firestore/types";

export type NormalizedPlanDayInput = {
  id?: string;
  label: string;
  sortOrder: number;
  exercises: {
    id?: string;
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

function indexExistingPlan(existingPlan?: Pick<WorkoutPlanDoc, "days"> | null) {
  const existingDaysById = new Map<string, WorkoutPlanDayEmbedded>();
  const existingRowsById = new Map<string, WorkoutPlanExerciseEmbedded>();

  for (const day of existingPlan?.days ?? []) {
    existingDaysById.set(day.id, day);
    for (const row of day.exercises) {
      existingRowsById.set(row.id, row);
    }
  }

  return { existingDaysById, existingRowsById };
}

function nextUniqueId(usedIds: Set<string>): string {
  let id = newDocId();
  while (usedIds.has(id)) {
    id = newDocId();
  }
  usedIds.add(id);
  return id;
}

function resolvePreservedDayId(
  inputId: string | undefined,
  existingDaysById: Map<string, WorkoutPlanDayEmbedded>,
  usedDayIds: Set<string>,
  retiredDayIds: Set<string>,
): string {
  const trimmed = inputId?.trim();
  if (
    trimmed &&
    !retiredDayIds.has(trimmed) &&
    existingDaysById.has(trimmed) &&
    !usedDayIds.has(trimmed)
  ) {
    usedDayIds.add(trimmed);
    return trimmed;
  }
  return nextUniqueId(usedDayIds);
}

function exerciseRowIdentityMatches(
  existing: WorkoutPlanExerciseEmbedded,
  input: NormalizedPlanDayInput["exercises"][number],
): boolean {
  const existingExerciseId = existing.exerciseId ?? null;
  const inputExerciseId = input.exerciseId ?? null;

  if (existingExerciseId && inputExerciseId) {
    return existingExerciseId === inputExerciseId;
  }

  if (!existingExerciseId && !inputExerciseId) {
    return true;
  }

  return false;
}

function rowIdentityChanged(
  existing: WorkoutPlanExerciseEmbedded,
  input: NormalizedPlanDayInput["exercises"][number],
): boolean {
  return (
    (existing.exerciseId ?? null) !== (input.exerciseId ?? null) ||
    (existing.customName ?? null) !== (input.customName ?? null)
  );
}

export type PlanRowChangeImpact = {
  retiredRowIds: Set<string>;
  identityChangedRowIds: Set<string>;
};

export function analyzePlanRowChanges(
  days: NormalizedPlanDayInput[],
  existingPlan?: Pick<WorkoutPlanDoc, "days"> | null,
): PlanRowChangeImpact {
  const { existingRowsById } = indexExistingPlan(existingPlan);
  const inputRowIds = new Set(
    days.flatMap((day) =>
      day.exercises
        .map((row) => row.id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const retiredRowIds = new Set(
    [...existingRowsById.keys()].filter((id) => !inputRowIds.has(id)),
  );
  const identityChangedRowIds = new Set<string>();

  for (const day of days) {
    for (const row of day.exercises) {
      const trimmed = row.id?.trim();
      if (!trimmed) continue;

      const existing = existingRowsById.get(trimmed);
      if (!existing || retiredRowIds.has(trimmed)) {
        continue;
      }

      if (!exerciseRowIdentityMatches(existing, row)) {
        retiredRowIds.add(trimmed);
        continue;
      }

      if (rowIdentityChanged(existing, row)) {
        identityChangedRowIds.add(trimmed);
      }
    }
  }

  return { retiredRowIds, identityChangedRowIds };
}

export class ActiveSessionPlanEditBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActiveSessionPlanEditBlockedError";
  }
}

export class WorkoutPlanExerciseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkoutPlanExerciseValidationError";
  }
}

function collectUniqueLibraryExerciseIds(
  normalizedDays: NormalizedPlanDayInput[],
): string[] {
  const ids = new Set<string>();
  for (const day of normalizedDays) {
    for (const row of day.exercises) {
      const exerciseId = row.exerciseId?.trim();
      if (exerciseId) {
        ids.add(exerciseId);
      }
    }
  }
  return [...ids];
}

export async function validateWorkoutPlanLibraryExerciseIds(
  gymId: string,
  normalizedDays: NormalizedPlanDayInput[],
): Promise<void> {
  const exerciseIds = collectUniqueLibraryExerciseIds(normalizedDays);
  if (exerciseIds.length === 0) {
    return;
  }

  const { customExercises } = getRepositories();
  const found = await customExercises.getByIds(
    platformContext,
    gymId,
    exerciseIds,
  );
  const foundIds = new Set(found.map((row) => row.id));

  const missingIds = exerciseIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    throw new WorkoutPlanExerciseValidationError(
      missingIds.length === 1
        ? "One exercise in this plan is no longer available in your library."
        : `${missingIds.length} exercises in this plan are no longer available in your library.`,
    );
  }

  for (const row of found) {
    if (row.gymId !== gymId) {
      throw new WorkoutPlanExerciseValidationError(
        "One exercise in this plan is not available in your gym library.",
      );
    }
  }
}

export async function validateWorkoutPlanSaveForActiveSession(
  gymId: string,
  memberId: string,
  existingPlan: Pick<WorkoutPlanDoc, "days"> | null | undefined,
  normalizedDays: NormalizedPlanDayInput[],
): Promise<void> {
  const { workoutSessions } = getRepositories();
  const active = await workoutSessions.findActiveSession(
    platformContext,
    gymId,
    memberId,
  );
  if (!active) {
    return;
  }

  const referencedRowIds = new Set(
    active.exercises.map((exercise) => exercise.workoutPlanExerciseId),
  );
  if (referencedRowIds.size === 0) {
    return;
  }

  const { retiredRowIds, identityChangedRowIds } = analyzePlanRowChanges(
    normalizedDays,
    existingPlan,
  );

  const blockedRowIds = [...referencedRowIds].filter(
    (rowId) => retiredRowIds.has(rowId) || identityChangedRowIds.has(rowId),
  );
  if (blockedRowIds.length === 0) {
    return;
  }

  throw new ActiveSessionPlanEditBlockedError(
    "Cannot remove or change exercises while the member has an active workout session. Wait until they finish the session, or only edit sets, reps, rest, and notes.",
  );
}

function resolvePreservedExerciseRowId(
  input: NormalizedPlanDayInput["exercises"][number],
  existingRowsById: Map<string, WorkoutPlanExerciseEmbedded>,
  usedRowIds: Set<string>,
  retiredRowIds: Set<string>,
): string {
  const trimmed = input.id?.trim();
  const existing = trimmed ? existingRowsById.get(trimmed) : undefined;

  if (
    trimmed &&
    existing &&
    !retiredRowIds.has(trimmed) &&
    !usedRowIds.has(trimmed) &&
    exerciseRowIdentityMatches(existing, input)
  ) {
    usedRowIds.add(trimmed);
    return trimmed;
  }

  if (trimmed && existing && !usedRowIds.has(trimmed)) {
    retiredRowIds.add(trimmed);
  }

  return nextUniqueId(usedRowIds);
}

export function buildEmbeddedPlanDays(
  days: NormalizedPlanDayInput[],
  existingPlan?: Pick<WorkoutPlanDoc, "days"> | null,
): WorkoutPlanDayEmbedded[] {
  const { existingDaysById, existingRowsById } = indexExistingPlan(existingPlan);
  const inputDayIds = new Set(
    days.map((day) => day.id?.trim()).filter((id): id is string => Boolean(id)),
  );
  const inputRowIds = new Set(
    days.flatMap((day) =>
      day.exercises
        .map((row) => row.id?.trim())
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const retiredDayIds = new Set(
    [...existingDaysById.keys()].filter((id) => !inputDayIds.has(id)),
  );
  const retiredRowIds = new Set(
    [...existingRowsById.keys()].filter((id) => !inputRowIds.has(id)),
  );
  const usedDayIds = new Set<string>();
  const usedRowIds = new Set<string>();

  return days.map((day) => {
    const dayId = resolvePreservedDayId(
      day.id,
      existingDaysById,
      usedDayIds,
      retiredDayIds,
    );

    return {
      id: dayId,
      label: day.label,
      sortOrder: day.sortOrder,
      exercises: day.exercises.map((row): WorkoutPlanExerciseEmbedded => {
        const rowId = resolvePreservedExerciseRowId(
          row,
          existingRowsById,
          usedRowIds,
          retiredRowIds,
        );
        const existingRow = existingRowsById.get(rowId);

        return {
          id: rowId,
          exerciseId: row.exerciseId,
          customName: row.customName,
          sortOrder: row.sortOrder,
          targetSets: row.targetSets,
          targetReps: row.targetReps,
          tempo: row.tempo,
          restSeconds: row.restSeconds,
          targetWeightKg: row.targetWeightKg,
          trackingTypeOverride: existingRow?.trackingTypeOverride ?? null,
        };
      }),
    };
  });
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
