"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canManageStaff } from "@/lib/permissions";
import { uploadGymLogo } from "@/lib/storage";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Gym name is required").max(120),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  ownerNotifyPhone: z.string().trim().max(30).optional().or(z.literal("")),
  ownerNotifyEmail: z
    .string()
    .trim()
    .email("Enter a valid owner email")
    .optional()
    .or(z.literal("")),
});

export async function updateGymProfile(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageStaff(user.role)) {
    return actionError("Only owners can update the gym profile.");
  }

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const data = parsed.data;

  // A logo upload failure (e.g. storage not configured) should not block
  // saving the rest of the profile — surface it as a warning instead.
  let logoUrl: string | undefined;
  let logoWarning: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const result = await uploadGymLogo(logo);
    if ("error" in result) {
      logoWarning = result.error;
    } else {
      logoUrl = result.url;
    }
  }

  const payload = {
    name: data.name,
    address: data.address || null,
    phone: data.phone || null,
    ownerNotifyPhone: data.ownerNotifyPhone || null,
    ownerNotifyEmail: data.ownerNotifyEmail || null,
    ...(logoUrl ? { logoUrl } : {}),
  };

  await withTenant(user.gymId, (tx) =>
    tx.gymProfile.upsert({
      where: { gymId: user.gymId },
      update: payload,
      create: { gymId: user.gymId, ...payload },
    }),
  );

  revalidatePath("/settings");
  return actionOk(
    logoWarning
      ? `Gym profile updated, but the logo was not: ${logoWarning}`
      : "Gym profile updated.",
  );
}
