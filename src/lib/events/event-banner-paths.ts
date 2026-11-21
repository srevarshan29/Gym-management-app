import {
  assertSafeStorageSegment,
  parseSupabasePublicStorageUrl,
  type SupabasePublicStorageUrlParseResult,
} from "@/lib/exercises/media-paths";

const EVENTS_SEGMENT = "events";
const BANNER_SEGMENT = "banner";

export function eventBannerStoragePath(gymId: string, eventId: string): string {
  const safeGymId = assertSafeStorageSegment(gymId, "gymId");
  const safeEventId = assertSafeStorageSegment(eventId, "eventId");
  return `gyms/${safeGymId}/${EVENTS_SEGMENT}/${safeEventId}/${BANNER_SEGMENT}`;
}

function bannerObjectPathPrefix(gymId: string, eventId: string): string {
  return eventBannerStoragePath(gymId, eventId);
}

export function isOwnedEventBannerObjectPath(
  objectPath: string,
  gymId: string,
  eventId: string,
): boolean {
  const prefix = bannerObjectPathPrefix(gymId, eventId);
  return objectPath === prefix || objectPath.startsWith(`${prefix}.`);
}

export function isOwnedEventBannerUrl(
  url: string | null | undefined,
  gymId: string,
  eventId: string,
): boolean {
  if (!url?.trim()) return false;
  const parsed = parseSupabasePublicStorageUrl(url.trim());
  if (!parsed.ok) return false;
  return isOwnedEventBannerObjectPath(parsed.objectPath, gymId, eventId);
}

export function parseOwnedEventBannerObjectPath(
  url: string | null | undefined,
  gymId: string,
  eventId: string,
): string | null {
  if (!url?.trim()) return null;
  const parsed: SupabasePublicStorageUrlParseResult = parseSupabasePublicStorageUrl(
    url.trim(),
  );
  if (!parsed.ok) return null;
  if (!isOwnedEventBannerObjectPath(parsed.objectPath, gymId, eventId)) {
    return null;
  }
  return parsed.objectPath;
}
