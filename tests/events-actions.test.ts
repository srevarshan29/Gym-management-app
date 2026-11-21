import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireGym = vi.fn();
const mockCreateEventRecord = vi.fn();
const mockGetById = vi.fn();
const mockUpdateEvent = vi.fn();
const mockStageEventBannerUpload = vi.fn();
const mockReplaceEventBannerAfterPersist = vi.fn();
const mockDeleteOwnedEventBannerObject = vi.fn();
const mockDeletePublicStorageObject = vi.fn();
const mockParseOwnedEventBannerObjectPath = vi.fn();

vi.mock("@/lib/session", () => ({
  requireGym: () => mockRequireGym(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/firestore/event-operations", () => ({
  createEventRecord: (...args: unknown[]) => mockCreateEventRecord(...args),
  deleteEventRecord: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getRepositories: () => ({
    events: {
      getById: mockGetById,
      updateEvent: mockUpdateEvent,
    },
  }),
  platformContext: { kind: "platform" },
}));

vi.mock("@/lib/firestore/helpers", () => ({
  newDocId: () => "evt-new",
}));

vi.mock("@/lib/events/event-banner-storage", () => ({
  stageEventBannerUpload: (...args: unknown[]) => mockStageEventBannerUpload(...args),
  replaceEventBannerAfterPersist: (...args: unknown[]) =>
    mockReplaceEventBannerAfterPersist(...args),
  deleteOwnedEventBannerObject: (...args: unknown[]) =>
    mockDeleteOwnedEventBannerObject(...args),
}));

vi.mock("@/lib/events/event-banner-paths", () => ({
  parseOwnedEventBannerObjectPath: (...args: unknown[]) =>
    mockParseOwnedEventBannerObjectPath(...args),
}));

vi.mock("@/lib/storage", () => ({
  deletePublicStorageObject: (...args: unknown[]) => mockDeletePublicStorageObject(...args),
}));

import { createEvent, updateEvent } from "@/app/actions/events";

function staffUser() {
  return { gymId: "gym-a", role: "OWNER" as const };
}

function baseForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("title", "Summer meet");
  fd.set("eventDate", "2026-08-01");
  fd.set("location", "Studio");
  fd.set("description", "Bring water");
  fd.set("removeBanner", "0");
  for (const [key, value] of Object.entries(overrides)) {
    fd.set(key, value);
  }
  return fd;
}

describe("events actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireGym.mockResolvedValue(staffUser());
    mockCreateEventRecord.mockResolvedValue({ id: "evt-new" });
    mockGetById.mockResolvedValue({
      id: "evt-1",
      gymId: "gym-a",
      bannerImageUrl: null,
    });
    mockUpdateEvent.mockResolvedValue({});
    mockDeleteOwnedEventBannerObject.mockResolvedValue({ ok: true });
  });

  it("creates event without banner", async () => {
    const result = await createEvent(undefined, baseForm());
    expect(result.ok).toBe(true);
    expect(mockStageEventBannerUpload).not.toHaveBeenCalled();
    expect(mockCreateEventRecord).toHaveBeenCalledWith(
      "gym-a",
      expect.objectContaining({ bannerImageUrl: null }),
      { id: "evt-new" },
    );
  });

  it("rejects unauthorized staff", async () => {
    mockRequireGym.mockResolvedValue({ gymId: "gym-a", role: "VIEWER" });
    const result = await createEvent(undefined, baseForm());
    expect(result.ok).toBe(false);
    expect(mockCreateEventRecord).not.toHaveBeenCalled();
  });

  it("creates event with staged banner", async () => {
    const file = new File([new Uint8Array(128)], "poster.webp", {
      type: "image/webp",
    });
    const fd = baseForm();
    fd.set("banner", file);
    mockStageEventBannerUpload.mockResolvedValue({
      ok: true,
      url: "https://example.supabase.co/storage/v1/object/public/gym-assets/gyms/gym-a/events/evt-new/banner.webp",
      objectPath: "gyms/gym-a/events/evt-new/banner.webp",
    });

    const result = await createEvent(undefined, fd);
    expect(result.ok).toBe(true);
    expect(mockCreateEventRecord).toHaveBeenCalledWith(
      "gym-a",
      expect.objectContaining({
        bannerImageUrl: expect.stringContaining("banner.webp"),
      }),
      { id: "evt-new" },
    );
  });

  it("cleans up staged upload when persistence fails", async () => {
    const file = new File([new Uint8Array(128)], "poster.webp", {
      type: "image/webp",
    });
    const fd = baseForm();
    fd.set("banner", file);
    mockStageEventBannerUpload.mockResolvedValue({
      ok: true,
      url: "https://example.supabase.co/storage/v1/object/public/gym-assets/gyms/gym-a/events/evt-new/banner.webp",
      objectPath: "gyms/gym-a/events/evt-new/banner.webp",
    });
    mockCreateEventRecord.mockRejectedValue(new Error("write failed"));
    mockParseOwnedEventBannerObjectPath.mockReturnValue(
      "gyms/gym-a/events/evt-new/banner.webp",
    );

    const result = await createEvent(undefined, fd);
    expect(result.ok).toBe(false);
    expect(mockDeletePublicStorageObject).toHaveBeenCalledWith(
      "gyms/gym-a/events/evt-new/banner.webp",
    );
  });

  it("replaces banner after successful update", async () => {
    mockGetById.mockResolvedValue({
      id: "evt-1",
      gymId: "gym-a",
      bannerImageUrl: "https://example.supabase.co/old.webp",
    });
    const file = new File([new Uint8Array(64)], "new.webp", { type: "image/webp" });
    const fd = baseForm();
    fd.set("id", "evt-1");
    fd.set("banner", file);
    mockStageEventBannerUpload.mockResolvedValue({
      ok: true,
      url: "https://example.supabase.co/new.webp",
      objectPath: "gyms/gym-a/events/evt-1/banner.webp",
    });

    const result = await updateEvent(undefined, fd);
    expect(result.ok).toBe(true);
    expect(mockReplaceEventBannerAfterPersist).toHaveBeenCalledWith(
      expect.objectContaining({
        gymId: "gym-a",
        eventId: "evt-1",
      }),
    );
  });

  it("blocks cross-gym edits when event is missing", async () => {
    mockGetById.mockResolvedValue(null);
    const fd = baseForm();
    fd.set("id", "evt-other-gym");

    const result = await updateEvent(undefined, fd);
    expect(result.ok).toBe(false);
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it("removes banner on update when requested", async () => {
    mockGetById.mockResolvedValue({
      id: "evt-1",
      gymId: "gym-a",
      bannerImageUrl: "https://example.supabase.co/banner.webp",
    });
    const fd = baseForm();
    fd.set("id", "evt-1");
    fd.set("removeBanner", "1");

    const result = await updateEvent(undefined, fd);
    expect(result.ok).toBe(true);
    expect(mockUpdateEvent).toHaveBeenCalledWith(
      expect.anything(),
      "gym-a",
      "evt-1",
      expect.objectContaining({ bannerImageUrl: null }),
    );
    expect(mockDeleteOwnedEventBannerObject).toHaveBeenCalled();
  });
});
