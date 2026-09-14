"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepositories, platformContext } from "@/lib/firestore";
import {
  convertVisitorRecord,
  createWalkInVisitor,
  deleteVisitorRecord,
} from "@/lib/firestore/visitor-operations";
import { requireGym } from "@/lib/session";
import { canManageMembers } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const visitorSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().min(3, "Phone number is required").max(30),
  visitDate: z.string().trim().min(1, "Visit date is required"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function parseVisitDate(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function revalidateVisitorPaths() {
  revalidatePath("/members/visitors");
  revalidatePath("/members/register-qr");
  revalidatePath("/analytics");
}

export async function createVisitor(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to log visitors.");
  }

  const parsed = visitorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const visitDate = parseVisitDate(parsed.data.visitDate);
  if (!visitDate) {
    return actionError("Invalid visit date.");
  }

  await createWalkInVisitor(user.gymId, {
    name: parsed.data.name,
    phone: parsed.data.phone,
    visitDate,
    notes: parsed.data.notes || null,
  });

  revalidateVisitorPaths();
  return actionOk("Visitor logged.");
}

export async function updateVisitor(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to update visitors.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing visitor id.");

  const parsed = visitorSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const visitDate = parseVisitDate(parsed.data.visitDate);
  if (!visitDate) {
    return actionError("Invalid visit date.");
  }

  const { visitors } = getRepositories();
  const existing = await visitors.getById(platformContext, user.gymId, id);
  if (!existing) {
    return actionError("Visitor not found.");
  }

  await visitors.updateVisitor(platformContext, user.gymId, id, {
    name: parsed.data.name,
    phone: parsed.data.phone,
    visitDate,
    notes: parsed.data.notes || null,
  });

  revalidateVisitorPaths();
  return actionOk("Visitor updated.");
}

export async function deleteVisitor(id: string): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageMembers(user.role)) {
    return actionError("You do not have permission to delete visitors.");
  }

  const deleted = await deleteVisitorRecord(user.gymId, id);
  if (!deleted) {
    return actionError("Visitor not found.");
  }

  revalidateVisitorPaths();
  return actionOk("Visitor deleted.");
}
