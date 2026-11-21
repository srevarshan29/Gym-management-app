import { validateImageUploadFile } from "@/lib/storage/image-validation";

export function readOptionalBannerFile(formData: FormData): File | null {
  const file = formData.get("banner");
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  return file;
}

export function formRequestsBannerRemoval(formData: FormData): boolean {
  return formData.get("removeBanner") === "1";
}

export function validateBannerFile(file: File): { ok: true } | { ok: false; error: string } {
  const validated = validateImageUploadFile(file);
  if (!validated.ok) {
    return validated;
  }
  if (validated.mime === "image/gif") {
    return { ok: false, error: "Event banners must be JPEG, PNG, or WebP." };
  }
  return { ok: true };
}
