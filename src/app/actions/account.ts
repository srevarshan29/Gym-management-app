"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  isDisplayNameTakenInGym,
  normalizeDisplayName,
} from "@/lib/user-display-name";

const updateMyProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

export async function updateMyProfile(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();

  const parsed = updateMyProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const name = normalizeDisplayName(parsed.data.name);

  const outcome = await withTenant(user.gymId, async (tx) => {
    const current = await tx.user.findFirst({
      where: { id: user.id, gymId: user.gymId },
      select: { name: true },
    });
    if (!current) {
      return { ok: false as const, error: "Could not update profile." };
    }

    const nameChanged =
      name.localeCompare(current.name, undefined, { sensitivity: "accent" }) !==
      0;
    if (nameChanged && (await isDisplayNameTakenInGym(tx, user.gymId, name, user.id))) {
      return { ok: false as const, error: "This name is already in use" };
    }

    const result = await tx.user.updateMany({
      where: { id: user.id, gymId: user.gymId },
      data: { name },
    });
    if (result.count === 0) {
      return { ok: false as const, error: "Could not update profile." };
    }

    return { ok: true as const };
  });

  if (!outcome.ok) {
    return actionError(outcome.error);
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/members");
  revalidatePath("/payments");

  return actionOk("Display name updated.");
}
