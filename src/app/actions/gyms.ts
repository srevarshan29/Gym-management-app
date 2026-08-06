"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { withPlatformLookup, withSuperAdmin } from "@/lib/db-context";
import { requireSuperAdmin } from "@/lib/session";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { DEFAULT_MEMBERSHIP_POLICY_TEXT } from "@/lib/membership-policy";

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
 * Provisions a brand-new tenant: a Gym row, its first OWNER account, and an
 * empty GymProfile — all in one transaction so a new gym never ends up
 * without an owner (or vice versa). Only reachable by SUPER_ADMIN accounts.
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

  const existing = await withPlatformLookup((tx) =>
    tx.user.findUnique({ where: { email: ownerEmail } }),
  );
  if (existing) {
    return actionError("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  await withSuperAdmin(async (tx) => {
    const gym = await tx.gym.create({ data: { name: gymName } });
    await tx.user.create({
      data: {
        gymId: gym.id,
        name: ownerName,
        email: ownerEmail,
        passwordHash,
        role: "OWNER",
      },
    });
    await tx.gymProfile.create({
      data: {
        gymId: gym.id,
        name: gymName,
        membershipPolicyText: DEFAULT_MEMBERSHIP_POLICY_TEXT,
      },
    });
  });

  revalidatePath("/admin");
  return actionOk("Gym created.");
}
