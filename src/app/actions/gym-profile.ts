"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { getRepositories, type StaffContext } from "@/lib/firestore";
import { persistMembershipPolicyText } from "@/lib/membership-policy";
import { canManageStaff } from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import { uploadGymLogo } from "@/lib/storage";

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
  membershipPolicyText: z.string().max(20000).optional().or(z.literal("")),
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
    membershipPolicyText: persistMembershipPolicyText(
      data.membershipPolicyText,
    ),
    ...(logoUrl ? { logoUrl } : {}),
  };

  const { gymProfiles } = getRepositories();
  await gymProfiles.upsert(toStaffContext(user), user.gymId, payload);

  revalidatePath("/settings");
  return actionOk(
    logoWarning
      ? `Gym profile updated, but the logo was not: ${logoWarning}`
      : "Gym profile updated.",
  );
}
