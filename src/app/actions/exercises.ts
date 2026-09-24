"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepositories, newDocId, platformContext } from "@/lib/firestore";
import {
  InvalidPaginationCursorError,
  TenantIsolationError,
} from "@/lib/firestore/errors";
import { MUSCLE_GROUP_VALUES } from "@/lib/exercises";
import { requireGym } from "@/lib/session";
import {
  canDeleteLibraryExercise,
  canEditExerciseDefaults,
  canManageExerciseLibrary,
} from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { resolveExerciseSource } from "@/lib/exercises/source";
import {
  BUILDER_LIBRARY_SEARCH_LIMIT,
  browseExerciseLibrary,
  EXERCISE_LIBRARY_PAGE_SIZE,
  searchExerciseLibrary,
  type ExerciseLibraryBrowsePage,
  type ExerciseLibrarySearchPage,
} from "@/lib/workout-tracking/exercise-library";

const searchExerciseLibrarySchema = z.object({
  query: z.string().trim().max(80).optional(),
  muscleGroup: z.enum(MUSCLE_GROUP_VALUES).optional().nullable(),
  startAfterId: z.string().trim().min(1).max(128).optional().nullable(),
  limit: z.coerce.number().int().min(1).max(BUILDER_LIBRARY_SEARCH_LIMIT).optional(),
});

const browseExerciseLibrarySchema = z.object({
  query: z.string().trim().max(80).optional(),
  muscleGroup: z.enum(MUSCLE_GROUP_VALUES).optional().nullable(),
  startAfterId: z.string().trim().min(1).max(128).optional().nullable(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(EXERCISE_LIBRARY_PAGE_SIZE)
    .optional(),
});

const createExerciseSchema = z.object({
  name: z.string().trim().min(1, "Exercise name is required").max(120),
  muscleGroup: z.enum(MUSCLE_GROUP_VALUES),
  defaultSets: z.coerce.number().int().min(1).max(20).optional().nullable(),
  defaultReps: z.string().trim().max(40).optional().or(z.literal("")),
  defaultTempo: z.string().trim().max(20).optional().or(z.literal("")),
  defaultRestSeconds: z.coerce.number().int().min(0).max(600).optional().nullable(),
});

const updateExerciseDefaultsSchema = z.object({
  id: z.string().trim().min(1),
  defaultSets: z.coerce.number().int().min(1).max(20).optional().nullable(),
  defaultReps: z.string().trim().max(40).optional().or(z.literal("")),
  defaultTempo: z.string().trim().max(20).optional().or(z.literal("")),
  defaultRestSeconds: z.coerce.number().int().min(0).max(600).optional().nullable(),
  trackingType: z.enum(["WEIGHTED", "TIME", "BODYWEIGHT"]).optional(),
});

function assertCanManage(role: Parameters<typeof canManageExerciseLibrary>[0]) {
  if (!canManageExerciseLibrary(role)) {
    return actionError("You do not have permission to manage exercises.");
  }
  return null;
}

function revalidateExercisePaths() {
  revalidatePath("/programmes/workout");
  revalidatePath("/programmes/exercises");
}

function paginationActionError(error: unknown): ActionResult | null {
  if (error instanceof InvalidPaginationCursorError) {
    return actionError("Invalid pagination cursor. Refresh and try again.");
  }
  if (error instanceof TenantIsolationError) {
    return actionError("Invalid pagination cursor for this gym.");
  }
  return null;
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

  const existing = await customExercises.getById(
    platformContext,
    user.gymId,
    id,
  );
  if (!existing) {
    return actionError("Exercise not found.");
  }

  const source = resolveExerciseSource(existing);
  if (source === "SEEDED") {
    return actionError("Starter exercises cannot be removed.");
  }
  if (!canDeleteLibraryExercise(user.role, existing)) {
    return actionError(
      "Catalog exercises can only be removed by an owner or admin.",
    );
  }

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
    return actionError("Exercise could not be removed.");
  }

  revalidateExercisePaths();
  return actionOk("Exercise removed.");
}

export async function updateExerciseDefaults(
  input: z.infer<typeof updateExerciseDefaultsSchema>,
): Promise<ActionResult> {
  const user = await requireGym();
  const denied = assertCanManage(user.role);
  if (denied) return denied;

  const parsed = updateExerciseDefaultsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const { customExercises } = getRepositories();
  const existing = await customExercises.getById(
    platformContext,
    user.gymId,
    parsed.data.id,
  );
  if (!existing) {
    return actionError("Exercise not found.");
  }

  const source = resolveExerciseSource(existing);
  if (source === "SEEDED") {
    return actionError("Starter exercises cannot be edited.");
  }
  if (!canEditExerciseDefaults(user.role, existing)) {
    return actionError(
      "Catalog exercises can only be edited by an owner or admin.",
    );
  }

  await customExercises.updateExerciseDefaults(
    platformContext,
    user.gymId,
    parsed.data.id,
    {
      defaultSets: parsed.data.defaultSets ?? null,
      defaultReps: parsed.data.defaultReps?.trim() || null,
      defaultTempo: parsed.data.defaultTempo?.trim() || null,
      defaultRestSeconds: parsed.data.defaultRestSeconds ?? null,
      trackingType: parsed.data.trackingType ?? existing.trackingType,
    },
  );

  revalidateExercisePaths();
  return actionOk("Exercise defaults updated.");
}

export async function searchExerciseLibraryAction(
  input: z.infer<typeof searchExerciseLibrarySchema>,
): Promise<ActionResult<ExerciseLibrarySearchPage>> {
  const user = await requireGym();
  const denied = assertCanManage(user.role);
  if (denied) return denied;

  const parsed = searchExerciseLibrarySchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid search input.");
  }

  try {
    const page = await searchExerciseLibrary(user.gymId, parsed.data);
    return actionOk(undefined, page);
  } catch (error) {
    const paginationError = paginationActionError(error);
    if (paginationError) return paginationError;
    throw error;
  }
}

export async function browseExerciseLibraryAction(
  input: z.infer<typeof browseExerciseLibrarySchema>,
): Promise<ActionResult<ExerciseLibraryBrowsePage>> {
  const user = await requireGym();

  const parsed = browseExerciseLibrarySchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid browse input.");
  }

  try {
    const page = await browseExerciseLibrary(user.gymId, parsed.data);
    return actionOk(undefined, page);
  } catch (error) {
    const paginationError = paginationActionError(error);
    if (paginationError) return paginationError;
    throw error;
  }
}
