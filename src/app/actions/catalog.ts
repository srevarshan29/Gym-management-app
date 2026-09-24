"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { browseExerciseCatalog } from "@/lib/catalog/catalog-browse";
import type { CatalogBrowsePage } from "@/lib/catalog/catalog-browse-types";
import {
  importCatalogExercisesForGym,
  MAX_CATALOG_IMPORT_BATCH,
  type CatalogImportResult,
} from "@/lib/catalog/catalog-import";
import { refreshExerciseFromCatalogForGym } from "@/lib/catalog/catalog-refresh";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getFirestoreDb, getRepositories } from "@/lib/firestore";
import {
  InvalidPaginationCursorError,
} from "@/lib/firestore/errors";
import { staffContextFromUser } from "@/lib/firestore/session-context";
import { MUSCLE_GROUP_VALUES } from "@/lib/muscle-groups";
import {
  canBrowseExerciseCatalog,
  canImportExerciseCatalog,
} from "@/lib/permissions";
import { requireGym, type GymSessionUser } from "@/lib/session";

const browseCatalogSchema = z.object({
  query: z.string().trim().max(80).optional(),
  muscleGroup: z.enum(MUSCLE_GROUP_VALUES).optional().nullable(),
  startAfterId: z.string().trim().min(1).max(128).optional().nullable(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const importCatalogSchema = z.object({
  catalogIds: z
    .array(z.string().trim().min(1).max(80))
    .min(1, "Select at least one catalog exercise.")
    .max(MAX_CATALOG_IMPORT_BATCH),
});

function assertCanBrowse(user: GymSessionUser): ActionResult<never> | null {
  if (!canBrowseExerciseCatalog(user.role)) {
    return actionError("You do not have permission to browse the exercise catalog.");
  }
  return null;
}

function assertCanImport(user: GymSessionUser): ActionResult<never> | null {
  if (!canImportExerciseCatalog(user.role)) {
    return actionError("You do not have permission to import catalog exercises.");
  }
  return null;
}

function revalidateExercisePaths() {
  revalidatePath("/programmes/workout");
  revalidatePath("/programmes/exercises");
}

function paginationActionError(error: unknown): ActionResult<never> | null {
  if (error instanceof InvalidPaginationCursorError) {
    return actionError("Invalid pagination cursor. Refresh and try again.");
  }
  return null;
}

export async function browseExerciseCatalogAction(
  input: z.infer<typeof browseCatalogSchema>,
): Promise<ActionResult<CatalogBrowsePage>> {
  const user = await requireGym();
  const denied = assertCanBrowse(user);
  if (denied) return denied;

  const parsed = browseCatalogSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid browse input.");
  }

  const ctx = staffContextFromUser(user);
  const { exerciseCatalog, customExercises } = getRepositories();

  try {
    const page = await browseExerciseCatalog({
      ctx,
      repos: { exerciseCatalog, customExercises },
      input: parsed.data,
    });

    return actionOk(undefined, page);
  } catch (error) {
    const paginationError = paginationActionError(error);
    if (paginationError) return paginationError;
    throw error;
  }
}

export async function importCatalogExercises(
  catalogIds: string[],
): Promise<ActionResult<CatalogImportResult>> {
  const user = await requireGym();
  const browseDenied = assertCanBrowse(user);
  if (browseDenied) return browseDenied;
  const importDenied = assertCanImport(user);
  if (importDenied) return importDenied;

  const parsed = importCatalogSchema.safeParse({ catalogIds });
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid import input.");
  }

  const ctx = staffContextFromUser(user);
  const result = await importCatalogExercisesForGym({
    db: getFirestoreDb(),
    ctx,
    gymId: user.gymId,
    catalogIds: parsed.data.catalogIds,
  });

  if (result.summary.imported > 0) {
    revalidateExercisePaths();
  }

  const message =
    result.summary.imported > 0
      ? `Imported ${result.summary.imported} exercise(s).`
      : "No new catalog exercises were imported.";

  return actionOk(message, result);
}

export async function refreshExerciseFromCatalog(
  exerciseId: string,
): Promise<ActionResult<{ status: string; catalogVersion?: string }>> {
  const user = await requireGym();
  const browseDenied = assertCanBrowse(user);
  if (browseDenied) return browseDenied;
  const importDenied = assertCanImport(user);
  if (importDenied) return importDenied;

  const trimmedId = exerciseId.trim();
  if (!trimmedId) {
    return actionError("Exercise id is required.");
  }

  const ctx = staffContextFromUser(user);
  const { customExercises, exerciseCatalog } = getRepositories();
  const result = await refreshExerciseFromCatalogForGym({
    ctx,
    gymId: user.gymId,
    exerciseId: trimmedId,
    repos: { customExercises, exerciseCatalog },
  });

  if (result.status === "refreshed") {
    revalidateExercisePaths();
    return actionOk("Exercise refreshed from catalog.", {
      status: result.status,
      catalogVersion: result.catalogVersion,
    });
  }

  if (result.status === "unchanged") {
    return actionOk("Exercise is already on the latest catalog version.", {
      status: result.status,
      catalogVersion: result.catalogVersion,
    });
  }

  return actionError(result.reason);
}
