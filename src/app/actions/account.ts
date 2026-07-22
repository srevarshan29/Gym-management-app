"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

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

  const name = parsed.data.name;

  const current = await withTenant(user.gymId, (tx) =>
    tx.user.findFirst({
      where: { id: user.id, gymId: user.gymId },
      select: { name: true },
    }),
  );
  if (!current) {
    return actionError("Could not update profile.");
  }

  if (name !== current.name) {
    const taken = await withTenant(user.gymId, (tx) =>
      tx.user.findFirst({
        where: {
          gymId: user.gymId,
          id: { not: user.id },
          name,
        },
        select: { id: true },
      }),
    );
    if (taken) {
      return actionError("This name is already in use");
    }
  }

  const result = await withTenant(user.gymId, (tx) =>
    tx.user.updateMany({
      where: { id: user.id, gymId: user.gymId },
      data: { name },
    }),
  );
  if (result.count === 0) {
    return actionError("Could not update profile.");
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/members");
  revalidatePath("/payments");

  return actionOk("Display name updated.");
}
