"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  getRepositories,
  newDocId,
  platformContext,
  type StaffContext,
} from "@/lib/firestore";
import { canManageStaff } from "@/lib/permissions";
import { requireGym } from "@/lib/session";
import { normalizeDisplayName } from "@/lib/user-display-name";

const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  role: z.enum(["OWNER", "ADMIN", "STAFF"]),
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
  if (role === "OWNER" && user.role !== "OWNER") {
    return actionError("Only an owner can assign the owner role.");
  }
  const displayName = normalizeDisplayName(name);
  const ctx = toStaffContext(user);
  const { users } = getRepositories();

  const existing = await users.findByEmail(platformContext, email);
  if (existing) {
    return actionError("An account with that email already exists.");
  }

  const nameTaken = await users.isDisplayNameTakenInGym(
    ctx,
    user.gymId,
    displayName,
  );
  if (nameTaken) {
    return actionError("This name is already in use");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await users.create(platformContext, {
    id: newDocId(),
    gymId: user.gymId,
    name: displayName,
    email,
    passwordHash,
    role,
  });

  revalidatePath("/operations/admins");
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

  if (role === "OWNER" && user.role !== "OWNER") {
    return actionError("Only an owner can assign the owner role.");
  }

  if (id === user.id && role !== "OWNER") {
    return actionError("You cannot remove your own owner access.");
  }

  const ctx = toStaffContext(user);
  const { users } = getRepositories();
  const updated = await users.updateRole(
    ctx,
    user.gymId,
    id,
    role as "OWNER" | "ADMIN" | "STAFF",
  );
  if (!updated) {
    return actionError("Staff account not found.");
  }

  revalidatePath("/operations/admins");
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

  const ctx = toStaffContext(user);
  const { users } = getRepositories();
  const deleted = await users.delete(ctx, user.gymId, id);
  if (!deleted) {
    throw new Error("Staff account not found.");
  }
  revalidatePath("/operations/admins");
}
