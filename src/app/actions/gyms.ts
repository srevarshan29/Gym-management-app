"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  getRepositories,
  newDocId,
  platformContext,
} from "@/lib/firestore";
import { DEFAULT_MEMBERSHIP_POLICY_TEXT } from "@/lib/membership-policy";
import { seedExercisesForGym } from "@/lib/exercises";
import { requireSuperAdmin } from "@/lib/session";

const createGymSchema = z.object({
  gymName: z.string().trim().min(1, "Gym name is required").max(120),
  ownerName: z.string().trim().min(1, "Owner name is required").max(120),
  ownerEmail: z.string().trim().email("Enter a valid email"),
  ownerPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

/**
 * Provisions a brand-new tenant: gym, first OWNER account, and gym profile.
 * Only reachable by SUPER_ADMIN accounts.
 */
export async function createGym(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireSuperAdmin();

  const parsed = createGymSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const { gymName, ownerName, ownerEmail, ownerPassword } = parsed.data;

  const { users, gyms, gymProfiles } = getRepositories();

  const existing = await users.findByEmail(platformContext, ownerEmail);
  if (existing) {
    return actionError("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const gymId = newDocId();
  const registrationToken = newDocId();

  await gyms.create(platformContext, {
    id: gymId,
    name: gymName,
    registrationToken,
  });

  await users.create(platformContext, {
    id: newDocId(),
    gymId,
    name: ownerName,
    email: ownerEmail,
    passwordHash,
    role: "OWNER",
  });

  await gymProfiles.create(platformContext, gymId, {
    name: gymName,
    membershipPolicyText: DEFAULT_MEMBERSHIP_POLICY_TEXT,
  });

  await seedExercisesForGym(gymId);

  revalidatePath("/admin");
  return actionOk("Gym created.");
}
