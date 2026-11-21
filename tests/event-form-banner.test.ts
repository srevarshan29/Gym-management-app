import { describe, expect, it } from "vitest";

import {
  formRequestsBannerRemoval,
  readOptionalBannerFile,
  validateBannerFile,
} from "@/lib/events/event-form-banner";
import { MAX_IMAGE_BYTES } from "@/lib/storage/image-validation";

describe("event banner form helpers", () => {
  it("reads optional banner file", () => {
    const fd = new FormData();
    expect(readOptionalBannerFile(fd)).toBeNull();

    const file = new File([new Uint8Array(10)], "a.webp", { type: "image/webp" });
    fd.set("banner", file);
    expect(readOptionalBannerFile(fd)).toBe(file);
  });

  it("detects remove banner flag", () => {
    const fd = new FormData();
    expect(formRequestsBannerRemoval(fd)).toBe(false);
    fd.set("removeBanner", "1");
    expect(formRequestsBannerRemoval(fd)).toBe(true);
  });

  it("rejects gif and oversize files", () => {
    const gif = new File([new Uint8Array(10)], "a.gif", { type: "image/gif" });
    expect(validateBannerFile(gif).ok).toBe(false);

    const huge = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "a.webp", {
      type: "image/webp",
    });
    expect(validateBannerFile(huge).ok).toBe(false);

    const ok = new File([new Uint8Array(10)], "a.png", { type: "image/png" });
    expect(validateBannerFile(ok).ok).toBe(true);
  });
});
