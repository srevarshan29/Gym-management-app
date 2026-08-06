import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

type AllowedImageMime = keyof typeof ALLOWED_IMAGE_TYPES;

function extensionForMime(mime: string): AllowedImageMime | null {
  if (mime === "image/svg+xml" || mime === "image/svg") {
    return null;
  }
  if (mime in ALLOWED_IMAGE_TYPES) {
    return mime as AllowedImageMime;
  }
  return null;
}

let cachedClient: SupabaseClient | null | undefined;

/** Returns null if Supabase Storage env vars are not configured. */
function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

export type UploadResult = { url: string } | { error: string };

async function uploadImage(
  file: File,
  pathWithoutExt: string,
): Promise<UploadResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      error:
        "Image upload is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable it.",
    };
  }

  const mime = file.type;
  if (mime === "image/svg+xml" || mime === "image/svg") {
    return { error: "SVG uploads are not allowed." };
  }

  const allowedMime = extensionForMime(mime);
  if (!allowedMime) {
    return {
      error: "File must be a JPEG, PNG, WebP, or GIF image.",
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be smaller than 5MB." };
  }

  const ext = ALLOWED_IMAGE_TYPES[allowedMime];
  const path = `${pathWithoutExt}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "gym-assets";

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: allowedMime, upsert: true });

  if (uploadError) {
    return { error: `Could not upload image: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}

/** Uploads a gym logo image to Supabase Storage and returns its public URL. */
export async function uploadGymLogo(file: File): Promise<UploadResult> {
  return uploadImage(file, `logo-${Date.now()}`);
}

/** Uploads a member profile photo and returns its public URL. */
export async function uploadMemberPhoto(
  file: File,
  memberId: string,
): Promise<UploadResult> {
  return uploadImage(file, `members/${memberId}-${Date.now()}`);
}
