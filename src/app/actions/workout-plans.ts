"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const workoutPlanSchema = z.object({
  memberId: z.string().trim().min(1, "Select a member"),
  title: z.string().trim().min(1, "Plan title is required").max(120),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  weeklySchedule: z
    .string()
    .trim()
    .min(1, "Weekly schedule is required")
    .max(10000, "Weekly schedule is too long"),
});

async function assertMemberInGym(gymId: string, memberId: string) {
  const member = await withTenant(gymId, (tx) =>
    tx.member.findFirst({
      where: { id: memberId, gymId },
      select: { id: true },
    }),
  );
  return Boolean(member);
}

export async function createWorkoutPlan(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to manage workout plans.");
  }

  const parsed = workoutPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const { memberId, title, level, weeklySchedule } = parsed.data;

  if (!(await assertMemberInGym(user.gymId, memberId))) {
    return actionError("Member not found.");
  }

  const existing = await withTenant(user.gymId, (tx) =>
    tx.workoutPlan.findFirst({
      where: { gymId: user.gymId, memberId },
      select: { id: true },
    }),
  );
  if (existing) {
    return actionError(
      "This member already has a workout plan. Edit or delete it first.",
    );
  }

  await withTenant(user.gymId, (tx) =>
    tx.workoutPlan.create({
      data: {
        gymId: user.gymId,
        memberId,
        title,
        level,
        weeklySchedule,
      },
    }),
  );

  revalidatePath("/programmes/workout");
  return actionOk("Workout plan created.");
}

export async function updateWorkoutPlan(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to manage workout plans.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing plan id.");

  const parsed = workoutPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const { memberId, title, level, weeklySchedule } = parsed.data;

  const result = await withTenant(user.gymId, (tx) =>
    tx.workoutPlan.updateMany({
      where: { id, gymId: user.gymId, memberId },
      data: { title, level, weeklySchedule },
    }),
  );
  if (result.count === 0) {
    return actionError("Workout plan not found.");
  }

  revalidatePath("/programmes/workout");
  return actionOk("Workout plan updated.");
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
  return actionOk("Workout plan deleted.");
}
