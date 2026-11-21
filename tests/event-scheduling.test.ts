import { describe, expect, it } from "vitest";

import {
  filterAnnounceableEvents,
  filterUndismissedAnnouncementEvents,
  isEventAnnounceable,
  isEventPast,
  startOfLocalCalendarDay,
} from "@/lib/events/event-scheduling";

describe("event scheduling", () => {
  it("treats today as announceable", () => {
    const now = new Date(2026, 5, 10, 15, 0, 0);
    const todayEvent = new Date(2026, 5, 10, 9, 0, 0);
    expect(isEventAnnounceable(todayEvent, now)).toBe(true);
    expect(isEventPast(todayEvent, now)).toBe(false);
  });

  it("excludes past calendar days", () => {
    const now = new Date(2026, 5, 10, 12, 0, 0);
    const yesterday = new Date(2026, 5, 9, 23, 59, 0);
    expect(isEventPast(yesterday, now)).toBe(true);
    expect(isEventAnnounceable(yesterday, now)).toBe(false);
  });

  it("orders announceable events by date ascending", () => {
    const rows = filterAnnounceableEvents(
      [
        {
          id: "b",
          title: "B",
          eventDate: new Date(2026, 6, 1),
          location: "A",
          description: null,
        },
        {
          id: "a",
          title: "A",
          eventDate: new Date(2026, 5, 15),
          location: "A",
          description: null,
        },
      ],
      new Date(2026, 5, 10),
    );
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("filters dismissed announcement ids", () => {
    const rows = filterUndismissedAnnouncementEvents(
      [
        { id: "a", eventDate: new Date() },
        { id: "b", eventDate: new Date() },
      ],
      new Set(["a"]),
    );
    expect(rows.map((r) => r.id)).toEqual(["b"]);
  });

  it("uses local midnight boundary", () => {
    const boundary = startOfLocalCalendarDay(new Date(2026, 2, 4, 23, 59));
    expect(boundary.getHours()).toBe(0);
    expect(boundary.getDate()).toBe(4);
  });
});
