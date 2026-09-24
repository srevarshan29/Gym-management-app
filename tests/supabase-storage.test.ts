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

import {
  deletePublicStorageObject,
  resetSupabaseAdminCache,
  uploadPublicStorageImage,
} from "@/lib/storage";
import { validateSupabaseStorageConfig } from "@/lib/storage/supabase-config";
import { gymExerciseMediaStoragePath } from "@/lib/exercises/media-paths";

const PUBLIC_BASE =
  "https://example.supabase.co/storage/v1/object/public/gym-assets";

function jpegFile(size = 1024) {
  return new File([new Uint8Array(size)], "demo.jpg", { type: "image/jpeg" });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetSupabaseAdminCache();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.SUPABASE_STORAGE_BUCKET = "gym-assets";
  getPublicUrlMock.mockReturnValue({
    data: { publicUrl: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.jpg` },
  });
  uploadMock.mockResolvedValue({ error: null });
  removeMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_STORAGE_BUCKET;
  resetSupabaseAdminCache();
});

describe("validateSupabaseStorageConfig", () => {
  it("rejects missing configuration", () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = validateSupabaseStorageConfig();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not configured");
      expect(result.error).not.toContain("service-role-key");
    }
  });

  it("rejects invalid URL and bucket values", () => {
    process.env.SUPABASE_URL = "not-a-url";
    expect(validateSupabaseStorageConfig().ok).toBe(false);

    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_STORAGE_BUCKET = "../evil";
    expect(validateSupabaseStorageConfig().ok).toBe(false);
  });

  it("accepts valid configuration without exposing secrets in user-facing errors", () => {
    const result = validateSupabaseStorageConfig();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.host).toBe("example.supabase.co");
      expect(result.config.bucket).toBe("gym-assets");
    }

    const missing = validateSupabaseStorageConfig({});
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error).not.toMatch(/service-role-key/i);
      expect(missing.error).not.toContain("service-role-key");
    }
  });
});

describe("uploadPublicStorageImage", () => {
  it("does not attempt upload when configuration is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetSupabaseAdminCache();

    const result = await uploadPublicStorageImage(
      jpegFile(),
      gymExerciseMediaStoragePath("gym-a", "ex-1", "primary"),
    );

    expect("error" in result).toBe(true);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("returns the uploaded object path on success", async () => {
    const result = await uploadPublicStorageImage(
      jpegFile(),
      gymExerciseMediaStoragePath("gym-a", "ex-1", "primary"),
    );

    expect(result).toEqual({
      url: `${PUBLIC_BASE}/gyms/gym-a/exercises/ex-1/primary.jpg`,
      objectPath: "gyms/gym-a/exercises/ex-1/primary.jpg",
    });
    expect(uploadMock).toHaveBeenCalledTimes(1);
  });
});

describe("deletePublicStorageObject", () => {
  it("rejects deleting unapproved object paths", async () => {
    const result = await deletePublicStorageObject("private/evil/primary.jpg");
    expect(result.ok).toBe(false);
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("deletes approved gym exercise object paths", async () => {
    const result = await deletePublicStorageObject(
      "gyms/gym-a/exercises/ex-1/primary.jpg",
    );
    expect(result).toEqual({ ok: true });
    expect(removeMock).toHaveBeenCalledWith([
      "gyms/gym-a/exercises/ex-1/primary.jpg",
    ]);
  });
});
