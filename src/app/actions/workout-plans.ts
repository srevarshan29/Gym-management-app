"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { workoutPlanPayloadSchema } from "@/lib/workout-tracking/types";

async function assertMemberInGym(tenantGymId: string, memberId: string) {
  const member = await withTenant(tenantGymId, (tx) =>
    tx.member.findFirst({
      where: { id: memberId, gymId: tenantGymId },
      select: { id: true },
    }),
  );
  return Boolean(member);
}

function normalizeExercises(
  exercises: z.infer<typeof workoutPlanPayloadSchema>["exercises"],
) {
  return exercises.map((row, index) => ({
    exerciseId: row.exerciseId?.trim() || null,
    customName: row.customName?.trim() || null,
    sortOrder: index,
    targetSets: row.targetSets,
    targetReps: row.targetReps.trim(),
    tempo: row.tempo?.trim() || null,
    restSeconds: row.restSeconds ?? null,
    targetWeightKg: row.targetWeightKg ?? null,
  }));
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
  if (!(await assertMemberInGym(user.gymId, memberId))) {
    return actionError("Member not found.");
  }

  const exerciseRows = normalizeExercises(parsed.data.exercises);

  const planId = await withTenant(user.gymId, async (tx) => {
    const existing = await tx.workoutPlan.findFirst({
      where: { gymId: user.gymId, memberId: memberId },
      select: { id: true },
    });

    if (existing) {
      await tx.workoutPlan.update({
        where: { id: existing.id },
        data: {
          title,
          durationWeeks: durationWeeks ?? null,
          focusGoal: focusGoal?.trim() || null,
          level: null,
          weeklySchedule: null,
        },
      });
      await tx.workoutPlanExercise.deleteMany({
        where: { workoutPlanId: existing.id },
      });
      await tx.workoutPlanExercise.createMany({
        data: exerciseRows.map((row) => ({
          gymId: user.gymId,
          workoutPlanId: existing.id,
          ...row,
        })),
      });
      return existing.id;
    }

    const created = await tx.workoutPlan.create({
      data: {
        gymId: user.gymId,
        memberId,
        title,
        durationWeeks: durationWeeks ?? null,
        focusGoal: focusGoal?.trim() || null,
        exercises: {
          create: exerciseRows.map((row) => ({
            gymId: user.gymId,
            ...row,
          })),
        },
      },
      select: { id: true },
    });
    return created.id;
  });

  revalidatePath("/programmes/workout");
  revalidatePath(`/programmes/workout/${planId}/edit`);
  revalidatePath("/member/workout");
  return { ...actionOk("Workout plan saved."), planId };
}

export async function deleteWorkoutPlan(id: string): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to manage workout plans.");
  }

  const result = await withTenant(user.gymId, (tx) =>
    tx.workoutPlan.deleteMany({ where: { id, gymId: user.gymId } }),
  );
  if (result.count === 0) {
    return actionError("Workout plan not found.");
  }

  revalidatePath("/programmes/workout");
  revalidatePath("/member/workout");
  return actionOk("Workout plan deleted.");
}
