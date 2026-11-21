import {
  eventBannerStoragePath,
  isOwnedEventBannerUrl,
  parseOwnedEventBannerObjectPath,
} from "@/lib/events/event-banner-paths";
import {
  deletePublicStorageObject,
  uploadPublicStorageImage,
  type UploadResult,
} from "@/lib/storage";

export type EventBannerUploadParams = {
  gymId: string;
  eventId: string;
  file: File;
};

export type EventBannerUploadOutcome =
  | { ok: true; url: string; objectPath: string }
  | { ok: false; error: string; cleanupFailed?: boolean };

async function cleanupUploadedObject(objectPath: string): Promise<boolean> {
  const deleted = await deletePublicStorageObject(objectPath);
  return deleted.ok;
}

export async function uploadEventBannerImage(
  params: EventBannerUploadParams,
): Promise<UploadResult> {
  const path = eventBannerStoragePath(params.gymId, params.eventId);
  return uploadPublicStorageImage(params.file, path);
}

export async function deleteOwnedEventBannerObject(
  url: string | null | undefined,
  gymId: string,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const objectPath = parseOwnedEventBannerObjectPath(url, gymId, eventId);
  if (!objectPath) {
    return { ok: false, error: "Banner is not an owned storage object." };
  }
  return deletePublicStorageObject(objectPath);
}

/**
 * Uploads an event banner, validates URL ownership, and returns metadata for persistence.
 * On validation failure, removes the new upload.
 */
export async function stageEventBannerUpload(
  params: EventBannerUploadParams,
): Promise<EventBannerUploadOutcome> {
  const upload = await uploadEventBannerImage(params);
  if ("error" in upload) {
    return { ok: false, error: upload.error };
  }

  if (
    !isOwnedEventBannerUrl(upload.url, params.gymId, params.eventId)
  ) {
    const cleanedUp = await cleanupUploadedObject(upload.objectPath);
    return {
      ok: false,
      error: cleanedUp
        ? "Uploaded banner failed validation and was removed."
        : "Uploaded banner failed validation.",
      cleanupFailed: !cleanedUp,
    };
  }

  return { ok: true, url: upload.url, objectPath: upload.objectPath };
}

export async function replaceEventBannerAfterPersist(params: {
  gymId: string;
  eventId: string;
  previousUrl: string | null | undefined;
  newObjectPath: string;
}): Promise<void> {
  const previousPath = parseOwnedEventBannerObjectPath(
    params.previousUrl,
    params.gymId,
    params.eventId,
  );
  if (!previousPath || previousPath === params.newObjectPath) {
    return;
  }
  await deletePublicStorageObject(previousPath);
}
