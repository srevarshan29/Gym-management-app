"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getRepositories, platformContext } from "@/lib/firestore";
import {
  createEventRecord,
  deleteEventRecord,
} from "@/lib/firestore/event-operations";
import { newDocId } from "@/lib/firestore/helpers";
import {
  formRequestsBannerRemoval,
  readOptionalBannerFile,
  validateBannerFile,
} from "@/lib/events/event-form-banner";
import {
  deletePublicStorageObject,
  type DeleteStorageResult,
} from "@/lib/storage";
import {
  deleteOwnedEventBannerObject,
  replaceEventBannerAfterPersist,
  stageEventBannerUpload,
} from "@/lib/events/event-banner-storage";
import { parseOwnedEventBannerObjectPath } from "@/lib/events/event-banner-paths";
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
  revalidatePath("/member", "layout");
}

type BannerStageSuccess = {
  kind: "set";
  url: string;
  objectPath: string;
};

type BannerResolution =
  | { change: "none" }
  | { change: "clear"; previousUrl: string | null | undefined }
  | { change: "set"; url: string; objectPath: string; previousUrl: string | null | undefined }
  | { error: string };

async function resolveBannerForCreate(
  gymId: string,
  eventId: string,
  formData: FormData,
): Promise<{ bannerImageUrl: string | null } | { error: string }> {
  const file = readOptionalBannerFile(formData);
  if (!file) {
    return { bannerImageUrl: null };
  }

  const valid = validateBannerFile(file);
  if (!valid.ok) {
    return { error: valid.error };
  }

  const staged = await stageEventBannerUpload({ gymId, eventId, file });
  if (!staged.ok) {
    return { error: staged.error };
  }

  return { bannerImageUrl: staged.url };
}

async function resolveBannerForUpdate(
  gymId: string,
  eventId: string,
  existingUrl: string | null | undefined,
  formData: FormData,
): Promise<BannerResolution> {
  const file = readOptionalBannerFile(formData);
  const remove = formRequestsBannerRemoval(formData);

  if (file) {
    const valid = validateBannerFile(file);
    if (!valid.ok) {
      return { error: valid.error };
    }

    const staged = await stageEventBannerUpload({ gymId, eventId, file });
    if (!staged.ok) {
      return { error: staged.error };
    }

    return {
      change: "set",
      url: staged.url,
      objectPath: staged.objectPath,
      previousUrl: existingUrl,
    };
  }

  if (remove) {
    return { change: "clear", previousUrl: existingUrl };
  }

  return { change: "none" };
}

async function cleanupStagedBanner(objectPath: string): Promise<void> {
  await deletePublicStorageObject(objectPath);
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

  const eventId = newDocId();
  const bannerResult = await resolveBannerForCreate(
    user.gymId,
    eventId,
    formData,
  );
  if ("error" in bannerResult) {
    return actionError(bannerResult.error);
  }

  try {
    await createEventRecord(
      user.gymId,
      {
        title: parsed.data.title,
        eventDate,
        location: parsed.data.location,
        description: parsed.data.description || null,
        bannerImageUrl: bannerResult.bannerImageUrl,
      },
      { id: eventId },
    );
  } catch (error) {
    if (bannerResult.bannerImageUrl) {
      const path = parseOwnedEventBannerObjectPath(
        bannerResult.bannerImageUrl,
        user.gymId,
        eventId,
      );
      if (path) {
        await cleanupStagedBanner(path);
      }
    }
    console.error("[events] create", error);
    return actionError("Could not save event.");
  }

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

  const banner = await resolveBannerForUpdate(
    user.gymId,
    id,
    existing.bannerImageUrl,
    formData,
  );
  if ("error" in banner) {
    return actionError(banner.error);
  }

  const patch: {
    title: string;
    eventDate: Date;
    location: string;
    description: string | null;
    bannerImageUrl?: string | null;
  } = {
    title: parsed.data.title,
    eventDate,
    location: parsed.data.location,
    description: parsed.data.description || null,
  };

  if (banner.change === "set") {
    patch.bannerImageUrl = banner.url;
  } else if (banner.change === "clear") {
    patch.bannerImageUrl = null;
  }

  try {
    await events.updateEvent(platformContext, user.gymId, id, patch);
  } catch (error) {
    if (banner.change === "set") {
      await cleanupStagedBanner(banner.objectPath);
    }
    console.error("[events] update", error);
    return actionError("Could not update event.");
  }

  if (banner.change === "set") {
    await replaceEventBannerAfterPersist({
      gymId: user.gymId,
      eventId: id,
      previousUrl: banner.previousUrl,
      newObjectPath: banner.objectPath,
    });
  } else if (banner.change === "clear") {
    const removed: DeleteStorageResult = await deleteOwnedEventBannerObject(
      banner.previousUrl,
      user.gymId,
      id,
    );
    if (!removed.ok && banner.previousUrl) {
      console.warn("[events] banner cleanup", removed.error);
    }
  }

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
