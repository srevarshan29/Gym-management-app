"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepositories, newDocId, platformContext } from "@/lib/firestore";
import { MUSCLE_GROUP_VALUES } from "@/lib/exercises";
import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const createExerciseSchema = z.object({
  name: z.string().trim().min(1, "Exercise name is required").max(120),
  muscleGroup: z.enum(MUSCLE_GROUP_VALUES),
  defaultSets: z.coerce.number().int().min(1).max(20).optional().nullable(),
  defaultReps: z.string().trim().max(40).optional().or(z.literal("")),
  defaultTempo: z.string().trim().max(20).optional().or(z.literal("")),
  defaultRestSeconds: z.coerce.number().int().min(0).max(600).optional().nullable(),
});

function assertCanManage(role: Parameters<typeof canManageMembers>[0]) {
  if (!canManageMembers(role)) {
    return actionError("You do not have permission to manage exercises.");
  }
  return null;
}

function revalidateExercisePaths() {
  revalidatePath("/programmes/workout");
  revalidatePath("/programmes/exercises");
}

export async function createExercise(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  const denied = assertCanManage(user.role);
  if (denied) return denied;

  const parsed = createExerciseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const data = parsed.data;
  const name = data.name.trim();
  const { customExercises } = getRepositories();

  const duplicate = await customExercises.findByNameLower(
    platformContext,
    user.gymId,
    name.toLowerCase(),
  );
  if (duplicate) {
    return actionError("An exercise with this name already exists.");
  }

  await customExercises.createExercise(
    platformContext,
    user.gymId,
    newDocId(),
    {
      name,
      muscleGroup: data.muscleGroup,
      defaultSets: data.defaultSets ?? null,
      defaultReps: data.defaultReps?.trim() || null,
      defaultTempo: data.defaultTempo?.trim() || null,
      defaultRestSeconds: data.defaultRestSeconds ?? null,
      isSeeded: false,
    },
  );

  revalidateExercisePaths();
  return actionOk("Exercise added to library.");
}

export async function deleteExercise(id: string): Promise<ActionResult> {
  const user = await requireGym();
  const denied = assertCanManage(user.role);
  if (denied) return denied;

  const { customExercises, workoutPlans } = getRepositories();

  const inUse = await workoutPlans.isExerciseReferenced(
    platformContext,
    user.gymId,
    id,
  );
  if (inUse) {
    return actionError(
      "This exercise is used in a member plan. Remove it from plans first.",
    );
  }

  const deleted = await customExercises.deleteCustomExercise(
    platformContext,
    user.gymId,
    id,
  );
  if (!deleted) {
    return actionError("Custom exercise not found or cannot delete seeded exercises.");
  }

  revalidateExercisePaths();
  return actionOk("Exercise removed.");
}
