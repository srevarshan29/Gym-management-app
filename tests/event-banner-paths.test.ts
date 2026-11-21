import { describe, expect, it } from "vitest";

import { eventBannerStoragePath } from "@/lib/events/event-banner-paths";
import { validatePublicStorageObjectPath } from "@/lib/storage/path-validation";

describe("event banner storage paths", () => {
  it("builds tenant-scoped banner paths", () => {
    expect(eventBannerStoragePath("gym-a", "evt-1")).toBe(
      "gyms/gym-a/events/evt-1/banner",
    );
  });

  it("passes path validation for banner objects", () => {
    const base = eventBannerStoragePath("gym-a", "evt-1");
    expect(validatePublicStorageObjectPath(`${base}.webp`)).toEqual({ ok: true });
    expect(validatePublicStorageObjectPath(`${base}.jpg`)).toEqual({ ok: true });
  });

  it("rejects traversal in gym id", () => {
    expect(() => eventBannerStoragePath("../evil", "evt-1")).toThrow();
  });
});
