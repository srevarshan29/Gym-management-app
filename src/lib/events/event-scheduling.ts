/** Local calendar-day start (matches existing events list / portal behaviour). */
export function startOfLocalCalendarDay(reference: Date = new Date()): Date {
  const day = new Date(reference);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function isEventPast(eventDate: Date, now: Date = new Date()): boolean {
  return eventDate.getTime() < startOfLocalCalendarDay(now).getTime();
}

/** Events on or after today's local midnight are eligible for announcements. */
export function isEventAnnounceable(eventDate: Date, now: Date = new Date()): boolean {
  return !isEventPast(eventDate, now);
}

export type PortalEventRow = {
  id: string;
  title: string;
  eventDate: Date;
  location: string;
  description: string | null;
  bannerImageUrl?: string | null;
};

export function sortEventsForAnnouncements<T extends { eventDate: Date }>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) => a.eventDate.getTime() - b.eventDate.getTime(),
  );
}

export function filterAnnounceableEvents<T extends { eventDate: Date }>(
  rows: T[],
  now: Date = new Date(),
): T[] {
  return sortEventsForAnnouncements(
    rows.filter((row) => isEventAnnounceable(row.eventDate, now)),
  );
}

export function filterUndismissedAnnouncementEvents<T extends { id: string }>(
  events: T[],
  dismissedIds: ReadonlySet<string>,
): T[] {
  return events.filter((event) => !dismissedIds.has(event.id));
}
