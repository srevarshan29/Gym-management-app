"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepositories, platformContext } from "@/lib/firestore";
import {
  createEventRecord,
  deleteEventRecord,
} from "@/lib/firestore/event-operations";
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

function revalidateEventsPaths() {
  revalidatePath("/operations/events");
  revalidatePath("/member/events");
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

  await createEventRecord(user.gymId, {
    title: parsed.data.title,
    eventDate,
    location: parsed.data.location,
    description: parsed.data.description || null,
  });

  revalidateEventsPaths();
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

  const { events } = getRepositories();
  const existing = await events.getById(platformContext, user.gymId, id);
  if (!existing) {
    return actionError("Event not found.");
  }

  await events.updateEvent(platformContext, user.gymId, id, {
    title: parsed.data.title,
    eventDate,
    location: parsed.data.location,
    description: parsed.data.description || null,
  });

  revalidateEventsPaths();
  return actionOk("Event updated.");
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const user = await requireGym();
  if (!canManageEvents(user.role)) {
    return actionError("You do not have permission to manage events.");
  }
  if (!id) return actionError("Missing event id.");

  const deleted = await deleteEventRecord(user.gymId, id);
  if (!deleted) {
    return actionError("Event not found.");
  }

  revalidateEventsPaths();
  return actionOk("Event removed.");
}
