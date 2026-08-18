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

function normalizeDays(
  days: z.infer<typeof workoutPlanPayloadSchema>["days"],
) {
  return days.map((day, dayIndex) => ({
    label: day.label.trim(),
    sortOrder: dayIndex,
    exercises: day.exercises.map((row, exerciseIndex) => ({
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

  const dayRows = normalizeDays(parsed.data.days);

  const planId = await withTenant(user.gymId, async (tx) => {
    const existing = await tx.workoutPlan.findFirst({
      where: { gymId: user.gymId, memberId: memberId },
      select: { id: true },
    });

    const planIdToUse = existing
      ? existing.id
      : (
          await tx.workoutPlan.create({
            data: {
              gymId: user.gymId,
              memberId,
              title,
              durationWeeks: durationWeeks ?? null,
              focusGoal: focusGoal?.trim() || null,
            },
            select: { id: true },
          })
        ).id;

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
    }

    await tx.workoutPlanExercise.deleteMany({
      where: { workoutPlanId: planIdToUse, gymId: user.gymId },
    });
    await tx.workoutPlanDay.deleteMany({
      where: { workoutPlanId: planIdToUse, gymId: user.gymId },
    });

    for (const day of dayRows) {
      const createdDay = await tx.workoutPlanDay.create({
        data: {
          gymId: user.gymId,
          workoutPlanId: planIdToUse,
          label: day.label,
          sortOrder: day.sortOrder,
        },
        select: { id: true },
      });
      await tx.workoutPlanExercise.createMany({
        data: day.exercises.map((row) => ({
          gymId: user.gymId,
          workoutPlanId: planIdToUse,
          workoutPlanDayId: createdDay.id,
          ...row,
        })),
      });
    }

    return planIdToUse;
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
