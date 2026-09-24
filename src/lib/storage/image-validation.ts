export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export type AllowedImageMime = keyof typeof ALLOWED_IMAGE_TYPES;

export function extensionForMime(mime: string): AllowedImageMime | null {
  if (mime === "image/svg+xml" || mime === "image/svg") {
    return null;
  }
  if (mime in ALLOWED_IMAGE_TYPES) {
    return mime as AllowedImageMime;
  }
  return null;
}

export function validateImageUploadFile(file: {
  type: string;
  size: number;
}): { ok: true; mime: AllowedImageMime; extension: string } | { ok: false; error: string } {
  const mime = file.type;
  if (mime === "image/svg+xml" || mime === "image/svg") {
    return { ok: false, error: "SVG uploads are not allowed." };
  }

  const allowedMime = extensionForMime(mime);
  if (!allowedMime) {
    return {
      ok: false,
      error: "File must be a JPEG, PNG, WebP, or GIF image.",
    };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image must be smaller than 5MB." };
  }

  return {
    ok: true,
    mime: allowedMime,
    extension: ALLOWED_IMAGE_TYPES[allowedMime],
  };
}
