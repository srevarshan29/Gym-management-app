"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
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

async function assertMemberInGym(tenantGymId: string, memberId: string) {
  const member = await withTenant(tenantGymId, (tx) =>
    tx.member.findFirst({
      where: { id: memberId, gymId: tenantGymId },
      select: { id: true },
    }),
  );
  return Boolean(member);
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

  if (!(await assertMemberInGym(user.gymId, memberId))) {
    return actionError("Member not found.");
  }

  const existing = await withTenant(user.gymId, (tx) =>
    tx.dietPlan.findFirst({
      where: { gymId: user.gymId, memberId: memberId },
      select: { id: true },
    }),
  );
  if (existing) {
    return actionError(
      "This member already has a diet plan. Edit or delete it first.",
    );
  }

  await withTenant(user.gymId, (tx) =>
    tx.dietPlan.create({
      data: {
        gymId: user.gymId,
        memberId,
        title,
        caloriesPerDay,
        mealPlan,
      },
    }),
  );

  revalidatePath("/programmes/diet");
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

  const result = await withTenant(user.gymId, (tx) =>
    tx.dietPlan.updateMany({
      where: { id: id, gymId: user.gymId, memberId: memberId },
      data: { title, caloriesPerDay, mealPlan },
    }),
  );
  if (result.count === 0) {
    return actionError("Diet plan not found.");
  }

  revalidatePath("/programmes/diet");
  return actionOk("Diet plan updated.");
}

export async function deleteDietPlan(id: string): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to manage diet plans.");
  }

  const result = await withTenant(user.gymId, (tx) =>
    tx.dietPlan.deleteMany({ where: { id, gymId: user.gymId } }),
  );
  if (result.count === 0) {
    return actionError("Diet plan not found.");
  }

  revalidatePath("/programmes/diet");
  return actionOk("Diet plan deleted.");
}
