"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canManagePackages } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const packageSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  price: z.coerce.number().min(0, "Price must be zero or more"),
  durationValue: z.coerce
    .number()
    .int("Duration must be a whole number")
    .min(1, "Duration must be at least 1"),
  durationUnit: z.enum(["MONTHS", "DAYS"]),
  isActive: z
    .enum(["0", "1"])
    .default("1")
    .transform((v) => v === "1"),
});

export async function createPackage(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManagePackages(user.role)) {
    return actionError("You do not have permission to manage packages.");
  }

  const parsed = packageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  await withTenant(user.gymId, (tx) =>
    tx.package.create({ data: { ...parsed.data, gymId: user.gymId } }),
  );
  revalidatePath("/packages");
  return actionOk("Package created.");
}

export async function updatePackage(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManagePackages(user.role)) {
    return actionError("You do not have permission to manage packages.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing package id.");

  const parsed = packageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const result = await withTenant(user.gymId, (tx) =>
    tx.package.updateMany({
      where: { id, gymId: user.gymId },
      data: parsed.data,
    }),
  );
  if (result.count === 0) return actionError("Package not found.");

  revalidatePath("/packages");
  return actionOk("Package updated.");
}

export async function setPackageActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManagePackages(user.role)) {
    return actionError("You do not have permission to manage packages.");
  }
  const result = await withTenant(user.gymId, (tx) =>
    tx.package.updateMany({
      where: { id, gymId: user.gymId },
      data: { isActive },
    }),
  );
  if (result.count === 0) return actionError("Package not found.");

  revalidatePath("/packages");
  return actionOk();
}
