import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const uploadMock = vi.fn();
const removeMock = vi.fn();
const getPublicUrlMock = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        remove: removeMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
  })),
}));

import { completeGymExerciseMediaUpload } from "@/lib/exercises/media-storage";
import { resetSupabaseAdminCache } from "@/lib/storage";

const PUBLIC_BASE =
  "https://example.supabase.co/storage/v1/object/public/gym-assets";

function jpegFile() {
  return new File([new Uint8Array(1024)], "demo.jpg", { type: "image/jpeg" });
}

function webpFile() {
  return new File([new Uint8Array(1024)], "demo.webp", { type: "image/webp" });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetSupabaseAdminCache();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.SUPABASE_STORAGE_BUCKET = "gym-assets";
  uploadMock.mockResolvedValue({ error: null });
  removeMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_STORAGE_BUCKET;
  resetSupabaseAdminCache();
});

describe("completeGymExerciseMediaUpload", () => {
  it("uploads, persists metadata, and succeeds", async () => {
    getPublicUrlMock.mockReturnValueOnce({
      data: { publicUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.jpg` },
    });
    const persistMedia = vi.fn().mockResolvedValue(undefined);

    const result = await completeGymExerciseMediaUpload({
      gymId: "gym-a",
      exerciseId: "ex-1",
      pose: "primary",
      file: jpegFile(),
      existing: null,
      persistMedia,
    });

    expect(result.ok).toBe(true);
    expect(persistMedia).toHaveBeenCalledTimes(1);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("cleans up the upload when metadata persistence fails", async () => {
    getPublicUrlMock.mockReturnValueOnce({
      data: { publicUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.jpg` },
    });
    const persistMedia = vi.fn().mockRejectedValue(new Error("firestore down"));

    const result = await completeGymExerciseMediaUpload({
      gymId: "gym-a",
      exerciseId: "ex-1",
      pose: "primary",
      file: jpegFile(),
      existing: null,
      persistMedia,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("could not be saved");
      expect(result.error).toContain("upload was removed");
      expect(result.error).not.toContain("service-role-key");
    }
    expect(removeMock).toHaveBeenCalledWith([
      "gyms/gym-a/exercises/ex-1/primary.jpg",
    ]);
  });

  it("reports cleanup failure without hiding metadata persistence failure", async () => {
    getPublicUrlMock.mockReturnValueOnce({
      data: { publicUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.jpg` },
    });
    removeMock.mockResolvedValueOnce({ error: { message: "delete failed" } });

    const result = await completeGymExerciseMediaUpload({
      gymId: "gym-a",
      exerciseId: "ex-1",
      pose: "primary",
      file: jpegFile(),
      existing: null,
      persistMedia: vi.fn().mockRejectedValue(new Error("firestore down")),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.cleanupFailed).toBe(true);
      expect(result.error).toContain("could not be saved");
      expect(result.error).toContain("cleanup may require attention");
    }
  });

  it("cleans up when post-upload URL validation fails", async () => {
    getPublicUrlMock.mockReturnValueOnce({
      data: {
        publicUrl:
          "https://evil.example/storage/v1/object/public/gym-assets/gyms/gym-a/exercises/ex-1/primary.jpg",
      },
    });

    const result = await completeGymExerciseMediaUpload({
      gymId: "gym-a",
      exerciseId: "ex-1",
      pose: "primary",
      file: jpegFile(),
      existing: null,
      persistMedia: vi.fn(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("security validation");
    }
    expect(removeMock).toHaveBeenCalledWith([
      "gyms/gym-a/exercises/ex-1/primary.jpg",
    ]);
  });

  it("deletes the previous owned object only after metadata persistence succeeds", async () => {
    getPublicUrlMock.mockReturnValueOnce({
      data: { publicUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.webp` },
    });

    const result = await completeGymExerciseMediaUpload({
      gymId: "gym-a",
      exerciseId: "ex-1",
      pose: "primary",
      file: webpFile(),
      existing: {
        primaryImageUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.jpg`,
        secondaryImageUrl: null,
        thumbnailUrl: null,
      },
      persistMedia: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.ok).toBe(true);
    expect(removeMock).toHaveBeenCalledWith([
      "gyms/gym-a/exercises/ex-1/primary.jpg",
    ]);
  });

  it("preserves the previous object when metadata persistence fails", async () => {
    getPublicUrlMock.mockReturnValueOnce({
      data: { publicUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.webp` },
    });

    const result = await completeGymExerciseMediaUpload({
      gymId: "gym-a",
      exerciseId: "ex-1",
      pose: "primary",
      file: webpFile(),
      existing: {
        primaryImageUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.jpg`,
        secondaryImageUrl: null,
        thumbnailUrl: null,
      },
      persistMedia: vi.fn().mockRejectedValue(new Error("firestore down")),
    });

    expect(result.ok).toBe(false);
    expect(removeMock).toHaveBeenCalledTimes(1);
    expect(removeMock).toHaveBeenCalledWith([
      "gyms/gym-a/exercises/ex-1/primary.webp",
    ]);
    expect(removeMock).not.toHaveBeenCalledWith([
      "gyms/gym-a/exercises/ex-1/primary.jpg",
    ]);
  });

  it("never deletes catalog, cross-gym, or non-owned previous URLs", async () => {
    getPublicUrlMock.mockReturnValueOnce({
      data: { publicUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.webp` },
    });

    const result = await completeGymExerciseMediaUpload({
      gymId: "gym-a",
      exerciseId: "ex-1",
      pose: "primary",
      file: webpFile(),
      existing: {
        primaryImageUrl: `${PUBLIC_BASE}/catalog/dev-push-up/primary.webp`,
        secondaryImageUrl: `${PUBLIC_BASE}/gyms/gym-b/exercises/ex-1/primary.webp`,
        thumbnailUrl: "https://external.example/image.jpg",
      },
      persistMedia: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.ok).toBe(true);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("does not upload when Supabase configuration is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetSupabaseAdminCache();

    const result = await completeGymExerciseMediaUpload({
      gymId: "gym-a",
      exerciseId: "ex-1",
      pose: "primary",
      file: jpegFile(),
      existing: null,
      persistMedia: vi.fn(),
    });

    expect(result.ok).toBe(false);
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
