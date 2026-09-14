"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepositories, platformContext } from "@/lib/firestore";
import {
  createDietPlanRecord,
  deleteDietPlanRecord,
} from "@/lib/firestore/diet-plan-operations";
import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const dietPlanSchema = z.object({
  memberId: z.string().trim().min(1, "Select a member"),
  title: z.string().trim().min(1, "Plan title is required").max(120),
  caloriesPerDay: z.coerce
    .number()
    .int("Calories must be a whole number")
    .min(1, "Calories must be at least 1")
    .max(10000, "Calories must be 10,000 or less"),
  mealPlan: z
    .string()
    .trim()
    .min(1, "Meal plan is required")
    .max(10000, "Meal plan is too long"),
});

function revalidateDietPlanPaths() {
  revalidatePath("/programmes/diet");
  revalidatePath("/member/diet");
}

export async function createDietPlan(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to manage diet plans.");
  }

  const parsed = dietPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const { memberId, title, caloriesPerDay, mealPlan } = parsed.data;
  const { members } = getRepositories();
  const member = await members.findByIdAndGym(
    platformContext,
    memberId,
    user.gymId,
  );
  if (!member) {
    return actionError("Member not found.");
  }

  const result = await createDietPlanRecord(user.gymId, {
    memberId,
    memberName: member.name,
    title,
    caloriesPerDay,
    mealPlan,
  });

  if (!result.created) {
    return actionError(
      "This member already has a diet plan. Edit or delete it first.",
    );
  }

  revalidateDietPlanPaths();
  return actionOk("Diet plan created.");
}

export async function updateDietPlan(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to manage diet plans.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing plan id.");

  const parsed = dietPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const { memberId, title, caloriesPerDay, mealPlan } = parsed.data;
  const { dietPlans } = getRepositories();
  const existing = await dietPlans.getById(platformContext, user.gymId, id);
  if (!existing || existing.memberId !== memberId) {
    return actionError("Diet plan not found.");
  }

  await dietPlans.update(platformContext, user.gymId, id, {
    title,
    caloriesPerDay,
    mealPlan,
  });

  revalidateDietPlanPaths();
  return actionOk("Diet plan updated.");
}

export async function deleteDietPlan(id: string): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to manage diet plans.");
  }

  const deleted = await deleteDietPlanRecord(user.gymId, id);
  if (!deleted) {
    return actionError("Diet plan not found.");
  }

  revalidateDietPlanPaths();
  return actionOk("Diet plan deleted.");
}
