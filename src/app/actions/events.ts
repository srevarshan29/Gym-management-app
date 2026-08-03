"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { withTenant } from "@/lib/db-context";
import { requireGym } from "@/lib/session";
import { canManageEvents } from "@/lib/permissions";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const eventFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  eventDate: z.string().trim().min(1, "Date is required"),
  location: z.string().trim().min(1, "Location is required").max(200),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
});

function parseEventDate(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function revalidateEventsPath() {
  revalidatePath("/operations/events");
}

export async function createEvent(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageEvents(user.role)) {
    return actionError("You do not have permission to manage events.");
  }

  const parsed = eventFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const eventDate = parseEventDate(parsed.data.eventDate);
  if (!eventDate) {
    return actionError("Invalid event date.");
  }

  await withTenant(user.gymId, (tx) =>
    tx.gymEvent.create({
      data: {
        gymId: user.gymId,
        title: parsed.data.title,
        eventDate,
        location: parsed.data.location,
        description: parsed.data.description || null,
      },
    }),
  );

  revalidateEventsPath();
  return actionOk("Event added.");
}

export async function updateEvent(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageEvents(user.role)) {
    return actionError("You do not have permission to manage events.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing event id.");

  const parsed = eventFieldsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? "Invalid input.");
  }

  const eventDate = parseEventDate(parsed.data.eventDate);
  if (!eventDate) {
    return actionError("Invalid event date.");
  }

  const result = await withTenant(user.gymId, (tx) =>
    tx.gymEvent.updateMany({
      where: { id, gymId: user.gymId },
      data: {
        title: parsed.data.title,
        eventDate,
        location: parsed.data.location,
        description: parsed.data.description || null,
      },
    }),
  );
  if (result.count === 0) {
    return actionError("Event not found.");
  }

  revalidateEventsPath();
  return actionOk("Event updated.");
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageEvents(user.role)) {
    return actionError("You do not have permission to manage events.");
  }
  if (!id) return actionError("Missing event id.");

  const result = await withTenant(user.gymId, (tx) =>
    tx.gymEvent.deleteMany({ where: { id, gymId: user.gymId } }),
  );
  if (result.count === 0) {
    return actionError("Event not found.");
  }

  revalidateEventsPath();
  return actionOk("Event removed.");
}
