"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { withPlatformLookup, withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canManageStaff } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["OWNER", "ADMIN", "STAFF"]),
});

export async function createStaff(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageStaff(user.role)) {
    return actionError("Only owners can manage staff accounts.");
  }

  const parsed = createStaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }
  const { name, email, password, role } = parsed.data;

  const existing = await withPlatformLookup((tx) =>
    tx.user.findUnique({ where: { email } }),
  );
  if (existing) {
    return actionError("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await withTenant(user.gymId, (tx) =>
    tx.user.create({
      data: { name, email, passwordHash, role, gymId: user.gymId },
    }),
  );

  revalidatePath("/settings");
  return actionOk("Staff account created.");
}

export async function updateStaffRole(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageStaff(user.role)) {
    return actionError("Only owners can manage staff accounts.");
  }

  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!id || !["OWNER", "ADMIN", "STAFF"].includes(role)) {
    return actionError("Invalid input.");
  }

  if (id === user.id && role !== "OWNER") {
    return actionError("You cannot remove your own owner access.");
  }

  const result = await withTenant(user.gymId, (tx) =>
    tx.user.updateMany({
      where: { id, gymId: user.gymId },
      data: { role: role as "OWNER" | "ADMIN" | "STAFF" },
    }),
  );
  if (result.count === 0) {
    return actionError("Staff account not found.");
  }

  revalidatePath("/settings");
  return actionOk("Role updated.");
}

export async function deleteStaff(formData: FormData): Promise<void> {
  const user = await requireGym();
  if (!canManageStaff(user.role)) {
    throw new Error("Only owners can manage staff accounts.");
  }
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing staff id.");
  if (id === user.id) {
    throw new Error("You cannot delete your own account.");
  }

  const result = await withTenant(user.gymId, (tx) =>
    tx.user.deleteMany({ where: { id, gymId: user.gymId } }),
  );
  if (result.count === 0) {
    throw new Error("Staff account not found.");
  }
  revalidatePath("/settings");
}
