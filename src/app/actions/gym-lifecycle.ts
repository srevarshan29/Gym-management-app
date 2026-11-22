"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  validateGymDeactivateTransition,
  validateGymReactivateTransition,
} from "@/lib/gym-lifecycle/admin-transitions";
import {
  cancelScheduledDeletionOnReactivate,
  confirmGymPurgeReady,
  requestImmediateGymDeletion,
  runOptionalGymDataExportForGym,
  scheduleGymDeletion,
} from "@/lib/gym-lifecycle/gym-deletion-service";
import { validateImmediateDeletionConfirmation } from "@/lib/gym-lifecycle/gym-deletion-confirm";
import { issueGymDataExportDownloadAuthorization } from "@/lib/gym-lifecycle/export/gym-data-export-download";
import { advanceGymPurgeStep } from "@/lib/gym-lifecycle/purge/purge-orchestrator";
import { getRepositories, platformContext } from "@/lib/firestore";
import { requireSuperAdmin } from "@/lib/session";

const gymIdSchema = z.object({
  gymId: z.string().trim().min(1, "Gym id is required").max(128),
});

const immediateDeletionSchema = gymIdSchema.extend({
  confirmName: z.string().trim().min(1),
  confirmId: z.string().trim().min(1),
  confirmPhrase: z.string().trim().min(1),
  confirmFinal: z.literal("true", { errorMap: () => ({ message: "Final confirmation is required." }) }),
});

export async function deactivateGymAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = gymIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid gym.");
  }

  const { gymId } = parsed.data;
  const { gyms, users } = getRepositories();
  const gym = await gyms.getById(platformContext, gymId);
  const transition = validateGymDeactivateTransition(gym, gymId);
  if (!transition.ok) {
    return actionError(transition.error);
  }

  const now = Timestamp.now();
  await gyms.setLifecycleStatus(platformContext, gymId, "deactivated", {
    deactivatedAt: now,
    deactivatedByUserId: admin.id,
  });
  await users.bumpCredentialsVersionForGym(platformContext, gymId);

  revalidatePath("/admin");
  return actionOk("Gym deactivated.");
}

export async function reactivateGymAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = gymIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid gym.");
  }

  const { gymId } = parsed.data;
  const { gyms } = getRepositories();
  const gym = await gyms.getById(platformContext, gymId);
  const transition = validateGymReactivateTransition(gym, gymId);
  if (!transition.ok) {
    return actionError(transition.error);
  }

  const hadPendingDeletion = Boolean(gym?.deletionMode);
  if (hadPendingDeletion) {
    await cancelScheduledDeletionOnReactivate({
      gymId,
      actorUserId: admin.id,
    });
  } else {
    await gyms.setLifecycleStatus(platformContext, gymId, "active", {
      deactivatedAt: null,
      deactivatedByUserId: null,
    });
  }

  revalidatePath("/admin");
  return actionOk("Gym reactivated.");
}

export async function scheduleGymDeletionAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = gymIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid gym.");
  }

  try {
    await scheduleGymDeletion({ gymId: parsed.data.gymId, actorUserId: admin.id });
    revalidatePath("/admin");
    return actionOk(
      "Scheduled deletion started. The gym is locked for 30 days; reactivation cancels the request.",
    );
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not schedule deletion.");
  }
}

export async function immediateGymDeletionAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = immediateDeletionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const { gyms } = getRepositories();
  const gym = await gyms.getById(platformContext, parsed.data.gymId);
  if (!gym) {
    return actionError("Gym not found.");
  }

  const confirm = validateImmediateDeletionConfirmation({
    gymName: gym.name,
    gymId: gym.id,
    confirmName: parsed.data.confirmName,
    confirmId: parsed.data.confirmId,
    confirmPhrase: parsed.data.confirmPhrase,
  });
  if (!confirm.ok) {
    return actionError(confirm.error);
  }

  try {
    await requestImmediateGymDeletion({
      gymId: parsed.data.gymId,
      actorUserId: admin.id,
    });
    revalidatePath("/admin");
    return actionError("Immediate deletion is not supported. Use scheduled deletion.");
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not start immediate deletion.");
  }
}

export async function runGymDataExportAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = gymIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid gym.");
  }

  try {
    const result = await runOptionalGymDataExportForGym({
      gymId: parsed.data.gymId,
      actorUserId: admin.id,
    });
    revalidatePath("/admin");
    const completeLabel = result.complete ? "complete" : "partial — see manifest in the ZIP";
    return actionOk(
      `Export ready (${completeLabel}). Download from the gym manager before ${result.artifactExpiresAt}.`,
    );
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Export failed.");
  }
}

type GymExportDownloadAuthData = {
  downloadToken: string;
  exportId: string;
};

export async function authorizeGymDataExportDownloadAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult<GymExportDownloadAuthData>> {
  const admin = await requireSuperAdmin();
  const parsed = gymIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid gym.");
  }

  try {
    const authz = await issueGymDataExportDownloadAuthorization({
      gymId: parsed.data.gymId,
      superAdminUserId: admin.id,
    });
    return actionOk("Download authorized.", {
      downloadToken: authz.bearerToken,
      exportId: authz.exportId,
    });
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not authorize download.");
  }
}

export async function confirmGymPurgeAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = gymIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid gym.");
  }

  try {
    await confirmGymPurgeReady({ gymId: parsed.data.gymId, actorUserId: admin.id });
    revalidatePath("/admin");
    return actionOk(
      "Final deletion confirmed. Destructive steps run only when ALLOW_TENANT_GYM_PURGE is enabled.",
    );
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Could not confirm purge.");
  }
}

export async function resumeGymPurgeAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = gymIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid gym.");
  }

  try {
    const result = await advanceGymPurgeStep({
      gymId: parsed.data.gymId,
      actorUserId: admin.id,
    });
    revalidatePath("/admin");
    if (result.status === "simulation") {
      const failures = result.report.authority.failures;
      return actionOk(
        failures.length > 0
          ? `Purge simulation: blocked (${failures[0]}). No destructive work ran.`
          : "Purge simulation: authority checks passed. Enable ALLOW_TENANT_GYM_PURGE to run destructive steps.",
      );
    }
    return actionOk(`Purge step finished (${result.status}).`);
  } catch (error) {
    return actionError(error instanceof Error ? error.message : "Purge step failed.");
  }
}
