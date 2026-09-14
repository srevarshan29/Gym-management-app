"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getRepositories, type StaffContext } from "@/lib/firestore";
import { requireGym } from "@/lib/session";
import {
  normalizeDisplayName,
} from "@/lib/user-display-name";

const updateMyProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
});

function toStaffContext(user: {
  id: string;
  gymId: string;
  role: StaffContext["role"];
}): StaffContext {
  return {
    kind: "staff",
    userId: user.id,
    gymId: user.gymId,
    role: user.role,
  };
}

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
  const ctx = toStaffContext(user);
  const { users } = getRepositories();

  const current = await users.findById(ctx, user.id);
  if (!current || current.gymId !== user.gymId) {
    return actionError("Could not update profile.");
  }

  const nameChanged =
    name.localeCompare(current.name, undefined, { sensitivity: "accent" }) !== 0;
  if (
    nameChanged &&
    (await users.isDisplayNameTakenInGym(ctx, user.gymId, name, user.id))
  ) {
    return actionError("This name is already in use");
  }

  const updated = await users.updateName(ctx, user.gymId, user.id, name);
  if (!updated) {
    return actionError("Could not update profile.");
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/members");
  revalidatePath("/payments");

  return actionOk("Display name updated.");
}
