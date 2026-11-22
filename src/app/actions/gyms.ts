"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Role } from "@prisma/client";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  getRepositories,
  newDocId,
  platformContext,
} from "@/lib/firestore";
import { DEFAULT_MEMBERSHIP_POLICY_TEXT } from "@/lib/membership-policy";
import { seedExercisesForGym } from "@/lib/exercises";
import { mirrorTenantStaffToPostgres } from "@/lib/seed/postgres-tenant-mirror";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { isStaffGoogleSignInConfigured } from "@/lib/staff-auth/google-sign-in";

const createGymSchema = z.object({
  gymName: z.string().trim().min(1, "Gym name is required").max(120),
  ownerName: z.string().trim().min(1, "Owner name is required").max(120),
  ownerEmail: z
    .string()
    .trim()
    .email("Enter a valid owner Gmail address"),
});

/**
 * Provisions a brand-new tenant: gym, first OWNER account (Google sign-in), and gym profile.
 * Only reachable by SUPER_ADMIN accounts.
 */
export async function createGym(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireSuperAdmin();

  if (!isStaffGoogleSignInConfigured()) {
    return actionError(
      "Staff Google sign-in is not configured. Set STAFF_AUTH_GOOGLE_CLIENT_ID and STAFF_AUTH_GOOGLE_CLIENT_SECRET before provisioning gyms.",
    );
  }

  const parsed = createGymSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const { gymName, ownerName, ownerEmail } = parsed.data;

  const { users, gyms, gymProfiles } = getRepositories();

  const existing = await users.findByEmail(platformContext, ownerEmail);
  if (existing) {
    return actionError("An account with that email already exists.");
  }

  const gymId = newDocId();
  const ownerUserId = newDocId();
  const registrationToken = newDocId();

  await gyms.create(platformContext, {
    id: gymId,
    name: gymName,
    registrationToken,
  });

  await users.create(platformContext, {
    id: ownerUserId,
    gymId,
    name: ownerName,
    email: ownerEmail.trim().toLowerCase(),
    passwordHash: null,
    role: "OWNER",
  });

  await gymProfiles.create(platformContext, gymId, {
    name: gymName,
    membershipPolicyText: DEFAULT_MEMBERSHIP_POLICY_TEXT,
  });

  await mirrorTenantStaffToPostgres(prisma, {
    gym: { gymId, name: gymName, registrationToken },
    owner: {
      id: ownerUserId,
      gymId,
      name: ownerName,
      email: ownerEmail.trim().toLowerCase(),
      passwordHash: null,
      role: Role.OWNER,
    },
  });

  await seedExercisesForGym(gymId);

  revalidatePath("/admin");
  return actionOk("Gym created.");
}