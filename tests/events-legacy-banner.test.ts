import { describe, expect, it } from "vitest";

import { mapEventDocToListItem } from "@/lib/events";

describe("legacy events without bannerImageUrl", () => {
  it("maps missing banner to null", () => {
    const item = mapEventDocToListItem({
      id: "e1",
      title: "Legacy",
      eventDate: { toDate: () => new Date("2026-01-01") },
      location: "Main",
      description: null,
    });
    expect(item.bannerImageUrl).toBeNull();
  });

  it("preserves uploaded banner url", () => {
    const item = mapEventDocToListItem({
      id: "e2",
      title: "Poster",
      eventDate: { toDate: () => new Date("2026-02-01") },
      location: "Studio",
      description: "Details",
      bannerImageUrl: "https://cdn.example/banner.webp",
    });
    expect(item.bannerImageUrl).toContain("banner.webp");
  });
});
