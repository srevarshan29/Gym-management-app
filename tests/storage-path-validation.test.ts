import { describe, expect, it } from "vitest";

import {
  catalogMediaStoragePath,
  gymExerciseMediaStoragePath,
} from "@/lib/exercises/media-paths";
import {
  validatePublicStorageObjectPath,
  validatePublicStoragePath,
} from "@/lib/storage/path-validation";

describe("validatePublicStoragePath", () => {
  it("accepts approved gym logo paths", () => {
    expect(validatePublicStoragePath("logo-1710000000000")).toEqual({ ok: true });
  });

  it("accepts approved member photo paths", () => {
    expect(validatePublicStoragePath("members/member-1-1710000000000")).toEqual({
      ok: true,
    });
  });

  it("accepts approved catalog and gym exercise media paths", () => {
    expect(
      validatePublicStoragePath(catalogMediaStoragePath("dev-push-up", "primary")),
    ).toEqual({ ok: true });
    expect(
      validatePublicStoragePath(
        gymExerciseMediaStoragePath("gym-a", "ex-1", "secondary"),
      ),
    ).toEqual({ ok: true });
  });

  it("rejects path traversal and absolute paths", () => {
    expect(validatePublicStoragePath("../catalog/evil/primary").ok).toBe(false);
    expect(validatePublicStoragePath("/members/m1-123").ok).toBe(false);
    expect(validatePublicStoragePath("gyms/gym-a/exercises/../ex-1/primary").ok).toBe(
      false,
    );
  });

  it("rejects empty, malformed, and unexpected prefixes", () => {
    expect(validatePublicStoragePath("").ok).toBe(false);
    expect(validatePublicStoragePath("   ").ok).toBe(false);
    expect(validatePublicStoragePath("private/evil/primary").ok).toBe(false);
    expect(validatePublicStoragePath("logo").ok).toBe(false);
    expect(validatePublicStoragePath("members/").ok).toBe(false);
    expect(validatePublicStoragePath("catalog/dev-push-up").ok).toBe(false);
    expect(validatePublicStoragePath("gyms/gym-a/exercises/ex-1").ok).toBe(false);
  });
});

describe("validatePublicStorageObjectPath", () => {
  it("accepts approved object paths with image extensions", () => {
    expect(
      validatePublicStorageObjectPath(
        `${gymExerciseMediaStoragePath("gym-a", "ex-1", "primary")}.webp`,
      ),
    ).toEqual({ ok: true });
  });

  it("rejects unsupported extensions and malformed object paths", () => {
    expect(
      validatePublicStorageObjectPath(
        `${gymExerciseMediaStoragePath("gym-a", "ex-1", "primary")}.svg`,
      ).ok,
    ).toBe(false);
    expect(validatePublicStorageObjectPath("catalog/dev-push-up/primary").ok).toBe(
      false,
    );
  });
});
