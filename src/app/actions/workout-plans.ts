"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepositories, platformContext } from "@/lib/firestore";
import {
  ActiveSessionPlanEditBlockedError,
  buildEmbeddedPlanDays,
  deleteWorkoutPlanRecord,
  saveWorkoutPlanRecord,
  validateWorkoutPlanLibraryExerciseIds,
  validateWorkoutPlanSaveForActiveSession,
  WorkoutPlanExerciseValidationError,
  type NormalizedPlanDayInput,
} from "@/lib/firestore/workout-plan-operations";
import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { workoutPlanPayloadSchema } from "@/lib/workout-tracking/types";

function normalizeDays(
  days: z.infer<typeof workoutPlanPayloadSchema>["days"],
): NormalizedPlanDayInput[] {
  return days.map((day, dayIndex) => ({
    id: day.id?.trim() || undefined,
    label: day.label.trim(),
    sortOrder: dayIndex,
    exercises: day.exercises.map((row, exerciseIndex) => ({
      id: row.id?.trim() || undefined,
      exerciseId: row.exerciseId?.trim() || null,
      customName: row.customName?.trim() || null,
      sortOrder: exerciseIndex,
      targetSets: row.targetSets,
      targetReps: row.targetReps.trim(),
      tempo: row.tempo?.trim() || null,
      restSeconds: row.restSeconds ?? null,
      targetWeightKg: row.targetWeightKg ?? null,
    })),
  }));
}

function revalidateWorkoutPlanPaths(planId?: string) {
  revalidatePath("/programmes/workout");
  if (planId) {
    revalidatePath(`/programmes/workout/${planId}/edit`);
  }
  revalidatePath("/member/workout");
}

export async function saveWorkoutPlan(
  payload: unknown,
): Promise<ActionResult & { planId?: string }> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to manage workout plans.");
  }

  const parsed = workoutPlanPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const { memberId, title, durationWeeks, focusGoal } = parsed.data;
  const { members, workoutPlans } = getRepositories();
  const member = await members.findByIdAndGym(
    platformContext,
    memberId,
    user.gymId,
  );
  if (!member) {
    return actionError("Member not found.");
  }

  const existingPlan = await workoutPlans.findByMemberId(
    platformContext,
    user.gymId,
    memberId,
  );

  const normalizedDays = normalizeDays(parsed.data.days);

  try {
    await validateWorkoutPlanLibraryExerciseIds(user.gymId, normalizedDays);
    await validateWorkoutPlanSaveForActiveSession(
      user.gymId,
      memberId,
      existingPlan,
      normalizedDays,
    );
  } catch (error) {
    if (error instanceof WorkoutPlanExerciseValidationError) {
      return actionError(error.message);
    }
    if (error instanceof ActiveSessionPlanEditBlockedError) {
      return actionError(error.message);
    }
    throw error;
  }

  const planId = await saveWorkoutPlanRecord(user.gymId, {
    memberId,
    memberName: member.name,
    title,
    durationWeeks: durationWeeks ?? null,
    focusGoal: focusGoal?.trim() || null,
    level: null,
    weeklySchedule: null,
    days: buildEmbeddedPlanDays(normalizedDays, existingPlan),
  });

  revalidateWorkoutPlanPaths(planId);
  return { ...actionOk("Workout plan saved."), planId };
}

export async function deleteWorkoutPlan(id: string): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to manage workout plans.");
  }

  const deleted = await deleteWorkoutPlanRecord(user.gymId, id);
  if (!deleted) {
    return actionError("Workout plan not found.");
  }

  revalidateWorkoutPlanPaths();
  return actionOk("Workout plan deleted.");
}
